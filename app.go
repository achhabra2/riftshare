package main

import (
	"context"
	"fmt"
	"io"
	"log"
	"math"
	"os"
	"os/exec"
	"path/filepath"
	goruntime "runtime"
	"time"

	"wormhole-wails-gui/transport"

	"github.com/psanford/wormhole-william/wormhole"
	"github.com/wailsapp/wails/v2/pkg/runtime"

	"github.com/klauspost/compress/zip"
)

// App application struct
type App struct {
	ctx           context.Context
	c             *transport.Client
	selectedFile  string
	selectedFiles []string
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{c: transport.NewClient()}
}

// startup is called at application startup
func (b *App) startup(ctx context.Context) {
	// Perform your setup here
	log.Println("In startup")
	log.Println(ctx)
	b.ctx = ctx
}

// domReady is called after the front-end dom has been loaded
func (b *App) domReady(ctx context.Context) {
	// Add your action here
}

// shutdown is called at application termination
func (b *App) shutdown(ctx context.Context) {
	// Perform your teardown here
}

// Greet returns a greeting for the given name
func (b *App) Greet(name string) string {
	return fmt.Sprintf("Hello %s!", name)
}

// Greet returns a greeting for the given name
func (b *App) OpenDialog() string {
	selection, err := runtime.OpenFileDialog(b.ctx, runtime.OpenDialogOptions{Title: "Select File", AllowFiles: true})
	if err != nil {
		runtime.LogInfo(b.ctx, "Error opening dialog")
	}
	runtime.LogInfo(b.ctx, "File Selected:"+selection)
	b.selectedFile = selection
	return selection
}

func (b *App) OpenDirectory() []string {
	dir, err := os.UserHomeDir()
	if err != nil {
		log.Println(err)
	}
	defaultPath := filepath.Join(dir, "Downloads")
	opts := runtime.OpenDialogOptions{Title: "Select File", AllowFiles: true, DefaultDirectory: defaultPath, AllowDirectories: true}
	selection, err := runtime.OpenMultipleFilesDialog(b.ctx, opts)
	if err != nil {
		runtime.LogInfo(b.ctx, "Error opening dialog")
	}
	runtime.LogInfo(b.ctx, "File Selected:")
	log.Println(selection)
	b.selectedFiles = selection
	return selection
}

func (b *App) SendFile(filePath string) {
	runtime.LogInfo(b.ctx, "Sending File: "+filePath)
	runtime.EventsEmit(b.ctx, "send:status", "sending")
	go func() {
		code, status, err := b.c.NewFileSend(filePath, wormhole.WithProgress(b.UpdateSendProgress))
		if err != nil {
			runtime.LogError(b.ctx, "Send Failed")
			runtime.EventsEmit(b.ctx, "send:status", "failed")
		}
		runtime.EventsEmit(b.ctx, "send:started", code)

		s := <-status

		if s.Error != nil {
			runtime.LogError(b.ctx, "Send Failed")
			runtime.EventsEmit(b.ctx, "send:status", "failed")
		} else if s.OK {
			runtime.LogInfo(b.ctx, "Send Success")
			runtime.EventsEmit(b.ctx, "send:status", "completed")
		}

		if filepath.Ext(filePath) == ".zip" {
			os.Remove(filePath)
		}
	}()
}

func (b *App) SendDirectory(dirPath string) {
	runtime.LogInfo(b.ctx, "Sending Directory: "+dirPath)
	runtime.EventsEmit(b.ctx, "send:status", "sending")
	go func() {
		code, status, err := b.c.NewDirSend(dirPath, wormhole.WithProgress(b.UpdateSendProgress))
		if err != nil {
			runtime.LogError(b.ctx, "Send Failed")
			runtime.EventsEmit(b.ctx, "send:status", "failed")
		}
		runtime.EventsEmit(b.ctx, "send:started", code)

		s := <-status

		if s.Error != nil {
			runtime.LogError(b.ctx, "Send Failed")
			runtime.EventsEmit(b.ctx, "send:status", "failed")
		} else if s.OK {
			runtime.LogInfo(b.ctx, "Send Success")
			runtime.EventsEmit(b.ctx, "send:status", "completed")
		}
	}()
}

func (b *App) ReceiveFile(code string) {
	runtime.LogInfo(b.ctx, "Receiving File...")
	runtime.EventsEmit(b.ctx, "receive:status", "receiving")
	// ctx := context.Background()
	// fileInfo, err := b.c.Receive(ctx, code)
	// if err != nil {
	// 	log.Fatal(err)
	// }

	// log.Printf("got msg: %+v\n", fileInfo)

	// _, err = io.Copy(os.Stdout, fileInfo)
	// if err != nil {
	// 	log.Fatal("readfull  error", err)
	// }
	pathname := make(chan string, 1)
	progress := make(chan float64)
	runtime.EventsEmit(b.ctx, "receive:started")

	go func() {
		path := <-pathname
		runtime.LogInfo(b.ctx, path)
		runtime.EventsEmit(b.ctx, "receive:path", path)
		runtime.EventsEmit(b.ctx, "receive:status", "receiving")
	}()

	go func() {
		for percent := range progress {
			// log.Println(percent)
			runtime.EventsEmit(b.ctx, "receive:updated", percent)
		}
	}()

	go func() {
		err := b.c.NewReceive(code, pathname, progress)
		if err != nil {
			runtime.LogError(b.ctx, "Receive Failed")
			runtime.EventsEmit(b.ctx, "receive:status", "failed")
		}
		runtime.EventsEmit(b.ctx, "receive:status", "completed")
	}()
}

func (b *App) UpdateSendProgress(sentBytes int64, totalBytes int64) {
	percentage := math.Round(float64(sentBytes) / float64(totalBytes) * 100)
	// runtime.LogInfo(b.ctx, "Progress"+strconv.Itoa(int(percentage)))
	runtime.EventsEmit(b.ctx, "send:updated", percentage)
}

func (b *App) OpenFile(path string) {

	var err error
	switch goruntime.GOOS {
	case "linux":
		err = exec.Command("xdg-open", path).Start()
	case "windows":
		err = exec.Command("rundll32", "url.dll,FileProtocolHandler", path).Start()
	case "darwin":
		err = exec.Command("open", path).Start()
	default:
		err = fmt.Errorf("unsupported platform")
	}
	if err != nil {
		log.Println(err)
	}

}

func (b *App) SelectedFilesSend() {
	if len(b.selectedFiles) == 1 {
		fileInfo, err := os.Stat(b.selectedFiles[0])
		if err != nil {
			runtime.LogError(b.ctx, "Could not check send file info")
		}
		if fileInfo.IsDir() {
			b.SendDirectory(b.selectedFiles[0])
		} else {
			b.SendFile(b.selectedFiles[0])
		}
	} else {
		archivePath := b.zipFiles(b.selectedFiles)
		b.SendFile(archivePath)
	}
}

func (b *App) zipFiles(pathNames []string) string {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		runtime.LogError(b.ctx, "Could not find home directory")
	}
	runtime.LogInfo(b.ctx, "creating zip archive...")
	runtime.EventsEmit(b.ctx, "send:status", "compressing files")
	timeString := time.Now().Format("2006-01-02-15-04-05")
	archiveName := fmt.Sprintf("wormhole-%s.zip", timeString)
	archivePath := filepath.Join(homeDir, archiveName)
	archive, err := os.Create(archivePath)
	if err != nil {
		runtime.LogFatal(b.ctx, "Error creating archive")
	}
	defer archive.Close()

	w := zip.NewWriter(archive)
	defer w.Close()

	for _, filePath := range pathNames {
		file, err := os.Open(filePath)
		if err != nil {
			log.Fatal(err)
		}
		defer file.Close()
		f, err := w.Create(filepath.Base(file.Name()))
		if err != nil {
			log.Fatal(err)
		}
		_, err = io.Copy(f, file)
		if err != nil {
			log.Fatal(err)
		}
	}
	runtime.EventsEmit(b.ctx, "send:status", "zip complete")

	return archivePath
}
