// Package transport handles sending and receiving using wormhole-william
package transport

import (
	"log"
	"os"
	"path/filepath"

	"github.com/psanford/wormhole-william/wormhole"
)

// Client defines the client for handling sending and receiving using wormhole-william
type Client struct {
	wormhole.Client

	// Notification holds the settings value for if we have notifications enabled or not.
	Notifications bool

	// OverwriteExisting holds the settings value for if we should overwrite already existing files.
	OverwriteExisting bool

	// DownloadPath holds the download path used for saving received files.
	DownloadPath string
}

// NewClient returns a new client for sending and receiving using wormhole-william
func NewClient() *Client {
	return &Client{Notifications: false, OverwriteExisting: true, DownloadPath: UserDownloadsFolder()}
}

// UserDownloadsFolder returns the downloads folder corresponding to the current user.
func UserDownloadsFolder() string {
	dir, err := os.UserHomeDir()
	if err != nil {
		log.Println(err)
	}

	return filepath.Join(dir, "Downloads")
}
