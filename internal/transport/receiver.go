package transport

import (
	"context"
	"fmt"
	"io"
	"io/ioutil"
	"log"
	"math"
	"os"
	"path/filepath"
	"strings"

	"riftshare/internal/transport/zip"

	"github.com/psanford/wormhole-william/wormhole"
)

func bail(msg *wormhole.IncomingMessage, err error) error {
	if msg == nil || msg.Type == wormhole.TransferText { // Rejecting text receives is not possible.
		return err
	} else if rerr := msg.Reject(); rerr != nil {
		return rerr
	}

	return err
}

// NewReceive runs a receive using wormhole-william and handles types accordingly.
func (c *Client) NewReceive(ctx context.Context, code string, pathname chan string, progress chan float64) (err error) {
	log.Println("In Receive", code, pathname)
	// ctx2 := context.Background()
	msg, err := c.Receive(ctx, code)
	if err != nil {
		log.Println("Error on receiving data", err)
		pathname <- "fail" // We want to always send a URI, even on fail, in order to not block goroutines.
		// fyne.LogError("Error on receiving data", err)
		return bail(msg, err)
	}
	log.Println(c.DownloadPath, msg.Name)

	// if msg.Type == wormhole.TransferText {
	// 	pathname <- "text"
	// 	text := &bytes.Buffer{}

	// 	// The size of text is always zero for some reason, see https://github.com/psanford/wormhole-william/issues/56.
	// 	//text.Grow(int(msg.TransferBytes64))

	// 	_, err := io.Copy(text, msg)
	// 	if err != nil {
	// 		// fyne.LogError("Could not copy the received text", err)
	// 		log.Println("Could not copy the received text", err)
	// 		return err
	// 	}

	// 	return nil
	// }

	path := filepath.Join(c.DownloadPath, msg.Name)
	pathname <- path

	if !c.OverwriteExisting {
		if _, err := os.Stat(path); err == nil || os.IsExist(err) {
			// fyne.LogError("Settings prevent overwriting existing files and folders", err)
			log.Println("Settings prevent overwriting existing files and folders", err)
			return bail(msg, os.ErrExist)
		}
	}

	if msg.Type == wormhole.TransferFile {
		file, err := os.Create(path)
		if err != nil {
			log.Println("Error on creating file", err)
			return bail(msg, err)
		}

		defer func() {
			if cerr := file.Close(); cerr != nil {
				log.Println("Error on closing file", err)
				err = cerr
			}
		}()

		// Create our progress reporter and pass it to be used alongside our writer
		counter := &WriteCounter{Total: uint64(msg.TransferBytes64), Progress: progress}
		_, err = io.Copy(file, io.TeeReader(msg, counter))
		close(progress)
		if err != nil {
			log.Println("Error on copying contents to file", err)
			return err
		}

		return nil
	}

	tmp, err := ioutil.TempFile("", msg.Name+"-*.zip.tmp")
	if err != nil {
		log.Println("Error on creating tempfile", err)
		return bail(msg, err)
	}

	defer func() {
		if cerr := tmp.Close(); cerr != nil {
			log.Println("Error on closing file", err)
			err = cerr
		}

		if rerr := os.Remove(tmp.Name()); rerr != nil {
			log.Println("Error on removing temp file", err)
			err = rerr
		}
	}()

	counter := &WriteCounter{Total: uint64(msg.TransferBytes64), Progress: progress}
	n, err := io.Copy(tmp, io.TeeReader(msg, counter))
	close(progress)
	if err != nil {
		log.Println("Error on copying contents to file", err)
		return err
	}

	err = zip.Extract(tmp, n, path)
	if err != nil {
		log.Println("Error on unzipping contents", err)
		return err
	}

	return nil
}

// WriteCounter counts the number of bytes written to it. It implements to the io.Writer interface
// and we can pass this into io.TeeReader() which will report progress on each write cycle.
type WriteCounter struct {
	Total    uint64
	Current  uint64
	Progress chan float64
}

func (wc *WriteCounter) Write(p []byte) (int, error) {
	n := len(p)
	wc.Current += uint64(n)
	wc.PrintProgress()
	return n, nil
}

func (wc WriteCounter) PrintProgress() {
	// Clear the line by using a character return to go back to the start and remove
	// the remaining characters by filling it with spaces
	fmt.Printf("\r%s", strings.Repeat(" ", 35))

	// Return again and print current status of download
	// We use the humanize package to print the bytes in a meaningful way (e.g. 10 MB)
	percent := math.Round((float64(wc.Current/1024) / float64(wc.Total/1024)) * 100)
	fmt.Printf("\rDownloading... %v complete", percent)
	wc.Progress <- percent
}
