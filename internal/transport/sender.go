package transport

import (
	"context"
	"io"
	"log"
	"os"
	"path/filepath"

	"github.com/psanford/wormhole-william/wormhole"
)

// NewFileSend takes the chosen file and sends it using wormhole-william.
func (c *Client) NewFileSend(ctx context.Context, filePath string, progress wormhole.SendOption) (string, chan wormhole.SendResult, error) {
	f, err := os.Open(filePath)
	if err != nil {
		log.Fatal(err)
	}
	_, fileName := filepath.Split(filePath)
	return c.SendFile(ctx, fileName, f, progress)
}

// NewDirSend takes a listable URI and sends it using wormhole-william.
func (c *Client) NewDirSend(ctx context.Context, dirPath string, progress wormhole.SendOption) (string, chan wormhole.SendResult, error) {
	prefixStr, dirName := filepath.Split(dirPath)
	prefix := len(prefixStr) // Where the prefix ends. Doing it this way is faster and works when paths don't use same separator (\ or /).

	var files []wormhole.DirectoryEntry
	if err := filepath.Walk(dirPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		} else if info.IsDir() || !info.Mode().IsRegular() {
			return nil
		}

		files = append(files, wormhole.DirectoryEntry{
			Path: path[prefix:], // Instead of strings.TrimPrefix. Paths don't need match (e.g. "C:/home/dir" == "C:\home\dir").
			Mode: info.Mode(),
			Reader: func() (io.ReadCloser, error) {
				return os.Open(path) // #nosec - path is already cleaned by filepath.Walk
			},
		})

		return nil
	}); err != nil {
		// fyne.LogError("Error on walking directory", err)
		return "", nil, err
	}

	return c.SendDirectory(ctx, dirName, files, progress)
}

// NewTextSend takes a text input and sends the text using wormhole-william.
func (c *Client) NewTextSend(text string, progress wormhole.SendOption) (string, chan wormhole.SendResult, error) {
	return c.SendText(context.Background(), text, progress)
}
