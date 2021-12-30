package main

import (
	"context"
	"errors"
	"fmt"
	"io"
	"math"
	"os"
	"os/exec"
	"path/filepath"
	goruntime "runtime"
	"strings"
	"time"

	"riftshare/internal/settings"
	"riftshare/internal/transport"
	"riftshare/internal/update"

	"github.com/gen2brain/beeep"
	"github.com/psanford/wormhole-william/wormhole"
	"github.com/wailsapp/wails/v2/pkg/runtime"

	"github.com/klauspost/compress/zip"
)

// App application struct
type App struct {
	ctx            context.Context
	c              *transport.Client
	selectedFiles  []string
	receivedFile   string
	wormholeCtx    *context.Context
	wormholeCancel *context.CancelFunc
	LogPath        string
	UserPrefs      settings.UserSettings
	IsTransferring bool
}

// NewApp creates a new App application struct
func NewApp(logPath string) *App {
	return &App{c: transport.NewClient(), LogPath: logPath}
}

// startup is called at application startup
func (b *App) startup(ctx context.Context) {
	// Perform your setup here
	b.ctx = ctx
	setting, err := settings.GetUserSettings()
	if err != nil {
		runtime.LogError(b.ctx, err.Error())
	}
	b.UserPrefs = setting
	b.UserPrefs.Version = "v" + b.GetCurrentVersion()
	b.c.Notifications = setting.Notifications
	b.c.OverwriteExisting = setting.Overwrite
	b.c.DownloadPath = setting.DownloadsDirectory
}

// domReady is called after the front-end dom has been loaded
func (b *App) domReady(ctx context.Context) {
	// Add your action here
	if b.UserPrefs.SelfUpdate && !b.AppInstalledFromPackageManager() {
		b.UpdateCheckUI()
	} 
}

// shutdown is called at application termination
func (b *App) shutdown(ctx context.Context) {
	// Perform your teardown here
	err := settings.SaveUserSettings(b.UserPrefs)
	if err != nil {
		runtime.LogError(b.ctx, err.Error())
	}
}

// Greet returns a greeting for the given name
func (b *App) OpenDirectoryDialog() ([]string, error) {
	opts := runtime.OpenDialogOptions{Title: "Select Directory", DefaultDirectory: b.UserPrefs.DownloadsDirectory}
	selection, err := runtime.OpenDirectoryDialog(b.ctx, opts)
	if err != nil {
		runtime.LogError(b.ctx, "Error opening dialog")
		b.ShowErrorDialog(err.Error())
		return b.selectedFiles, errors.New("system error opening dialog")
	}
	runtime.LogInfo(b.ctx, "File Selected:"+selection)
	if selection == "" {
		runtime.LogError(b.ctx, "No files selected")
		return b.selectedFiles, errors.New("invalid selection")
	}
	b.selectedFiles = []string{selection}
	return b.selectedFiles, nil
}

func (b *App) OpenFilesDialog() ([]string, error) {
	opts := runtime.OpenDialogOptions{Title: "Select File", DefaultDirectory: b.UserPrefs.DownloadsDirectory}
	selection, err := runtime.OpenMultipleFilesDialog(b.ctx, opts)
	if err != nil {
		runtime.LogError(b.ctx, "Error opening dialog")
		b.ShowErrorDialog(err.Error())
		return b.selectedFiles, errors.New("system error opening dialog")
	}
	runtime.LogInfo(b.ctx, "File Selected:"+fmt.Sprint(selection))
	if len(selection) == 0 {
		runtime.LogError(b.ctx, "No files selected")
		return b.selectedFiles, errors.New("invalid selection")
	}
	b.selectedFiles = selection
	return b.selectedFiles, nil
}

func (b *App) SendFile(filePath string) {
	runtime.LogInfo(b.ctx, "Sending File: "+filePath)
	runtime.EventsEmit(b.ctx, "send:status", "retrieving code")

	go func() {
		ctx := *b.wormholeCtx
		code, status, err := b.c.NewFileSend(ctx, filePath, wormhole.WithProgress(b.UpdateSendProgress))
		if err != nil {
			runtime.LogError(b.ctx, "Send Failed")
			runtime.EventsEmit(b.ctx, "send:status", "failed")
			b.ShowErrorDialog(err.Error())
		}
		runtime.EventsEmit(b.ctx, "send:started", code)
		runtime.EventsEmit(b.ctx, "send:status", "waiting for receiver")

		select {
		case s := <-status:
			if s.Error != nil {
				runtime.LogError(b.ctx, "Send Failed")
				runtime.EventsEmit(b.ctx, "send:status", "failed")
				b.ShowErrorDialog(s.Error.Error())
			} else if s.OK {
				runtime.LogInfo(b.ctx, "Send Success")
				runtime.EventsEmit(b.ctx, "send:status", "completed")
				if b.c.Notifications {
					beeep.Notify("RiftShare", "Send Complete", "appicon.png")
				}
			}

			if filepath.Ext(filePath) == ".zip" {
				os.Remove(filePath)
			}
		case <-ctx.Done():
			// If the request gets cancelled, log it
			runtime.LogInfo(b.ctx, "Request cancelled, removing zip file")
			if filepath.Ext(filePath) == ".zip" {
				os.Remove(filePath)
			}
			return
		}
	}()
}

func (b *App) SendDirectory(dirPath string) {
	runtime.LogInfo(b.ctx, "Sending Directory: "+dirPath)
	runtime.EventsEmit(b.ctx, "send:status", "retrieving code")

	go func() {
		code, status, err := b.c.NewDirSend(*b.wormholeCtx, dirPath, wormhole.WithProgress(b.UpdateSendProgress))
		if err != nil {
			runtime.LogError(b.ctx, "Send Failed")
			runtime.EventsEmit(b.ctx, "send:status", "failed")
			b.ShowErrorDialog(err.Error())
		}
		runtime.EventsEmit(b.ctx, "send:started", code)
		runtime.EventsEmit(b.ctx, "send:status", "waiting for receiver")

		s := <-status

		if s.Error != nil {
			runtime.LogError(b.ctx, "Send Failed")
			runtime.EventsEmit(b.ctx, "send:status", "failed")
			b.ShowErrorDialog(s.Error.Error())
		} else if s.OK {
			runtime.LogInfo(b.ctx, "Send Success")
			runtime.EventsEmit(b.ctx, "send:status", "completed")
		}
	}()
}

func (b *App) ReceiveFile(code string) {
	runtime.LogInfo(b.ctx, "Receiving File...")
	runtime.EventsEmit(b.ctx, "receive:status", "receiving")

	ctx := context.Background()
	ctx, cancel := context.WithCancel(ctx)
	b.wormholeCtx = &ctx
	b.wormholeCancel = &cancel

	pathname := make(chan string, 1)
	progress := make(chan float64)
	runtime.EventsEmit(b.ctx, "receive:started")

	go func() {
		path := <-pathname
		runtime.LogInfo(b.ctx, path)
		runtime.EventsEmit(b.ctx, "receive:path", path)
		runtime.EventsEmit(b.ctx, "receive:status", "receiving")
		b.receivedFile = path
	}()

	go func() {
		for percent := range progress {
			runtime.EventsEmit(b.ctx, "receive:updated", percent)
		}
	}()

	go func() {
		err := b.c.NewReceive(*b.wormholeCtx, code, pathname, progress)
		if err != nil {
			runtime.LogError(b.ctx, "Receive Failed")
			runtime.EventsEmit(b.ctx, "receive:status", "failed")
			b.ShowErrorDialog(err.Error())
		}
		runtime.EventsEmit(b.ctx, "receive:status", "completed")
		if b.c.Notifications {
			beeep.Notify("RiftShare", "Receive Complete", "appicon.png")
		}
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
		err = exec.Command("xdg-open", path).Run()
	case "windows":
		err = exec.Command("rundll32", "url.dll,FileProtocolHandler", path).Run()
	case "darwin":
		err = exec.Command("open", path).Run()
	default:
		err = fmt.Errorf("unsupported platform")
	}
	if err != nil {
		runtime.LogError(b.ctx, err.Error())
		// If filehandler isn't found retry with directory
		dir, _ := filepath.Split(path)
		b.OpenFile(dir)
	}
}

func (b *App) SelectedFilesSend() {
	// Create a new context
	ctx := context.Background()
	// Create a new context, with its cancellation function
	// from the original context
	ctx, cancel := context.WithCancel(ctx)
	b.wormholeCtx = &ctx
	b.wormholeCancel = &cancel
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
	runtime.EventsEmit(b.ctx, "send:status", "compressing Files")
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
			runtime.LogError(b.ctx, err.Error())
			b.ShowErrorDialog(err.Error())
		}
		defer file.Close()
		f, err := w.Create(filepath.Base(file.Name()))
		if err != nil {
			runtime.LogError(b.ctx, err.Error())
			b.ShowErrorDialog(err.Error())
		}
		_, err = io.Copy(f, file)
		if err != nil {
			runtime.LogError(b.ctx, err.Error())
			b.ShowErrorDialog(err.Error())
		}
	}
	runtime.EventsEmit(b.ctx, "send:status", "zip Complete")

	return archivePath
}

func (b *App) CancelWormholeRequest() {
	runtime.LogInfo(b.ctx, "Cancelled wormhole request. ")
	cancel := *b.wormholeCancel
	cancel()
}

func (b *App) UpdateCheckUI() {
	shouldUpdate, latestVersion := update.CheckForUpdate()
	if shouldUpdate {
		updateMessage := fmt.Sprintf("New Version Available, would you like to update to v%s", latestVersion)
		buttons := []string{"Yes", "No"}
		dialogOpts := runtime.MessageDialogOptions{Title: "Update Available", Message: updateMessage, Type: runtime.QuestionDialog, Buttons: buttons, DefaultButton: "Yes", CancelButton: "No"}
		action, err := runtime.MessageDialog(b.ctx, dialogOpts)
		if err != nil {
			runtime.LogError(b.ctx, "Error in update dialog. ")
		}
		runtime.LogInfo(b.ctx, action)
		if action == "Yes" {
			runtime.LogInfo(b.ctx, "Update clicked")
			var updated bool
			if goruntime.GOOS == "darwin" {
				updated = update.DoSelfUpdateMac()
			} else {
				updated = update.DoSelfUpdate()
			}
			if updated {
				buttons = []string{"Ok"}
				dialogOpts = runtime.MessageDialogOptions{Title: "Update Succeeded", Message: "Update Successfull. Please restart this app to take effect. ", Type: runtime.InfoDialog, Buttons: buttons, DefaultButton: "Ok"}
				runtime.MessageDialog(b.ctx, dialogOpts)
			} else {
				buttons = []string{"Ok"}
				dialogOpts = runtime.MessageDialogOptions{Title: "Update Error", Message: "Update failed, please manually update from GitHub Releases. ", Type: runtime.InfoDialog, Buttons: buttons, DefaultButton: "Ok"}
				runtime.MessageDialog(b.ctx, dialogOpts)
			}
		}
	}
}

func (b *App) GetCurrentVersion() string {
	return update.Version
}

func (b *App) GetLogPath() string {
	return b.LogPath
}

func (b *App) SetDownloadsFolder() string {
	opts := runtime.OpenDialogOptions{Title: "Select Directory", DefaultDirectory: b.UserPrefs.DownloadsDirectory}
	selection, err := runtime.OpenDirectoryDialog(b.ctx, opts)
	if err != nil {
		runtime.LogInfo(b.ctx, "Error opening dialog")
		b.ShowErrorDialog(err.Error())
	}
	b.c.DownloadPath = selection
	b.UserPrefs.DownloadsDirectory = selection
	return b.UserPrefs.DownloadsDirectory
}

func (b *App) SetOverwriteParam(val bool) bool {
	b.c.OverwriteExisting = val
	b.UserPrefs.Overwrite = val
	return b.c.OverwriteExisting
}

func (b *App) SetNotificationsParam(val bool) bool {
	b.c.Notifications = val
	b.UserPrefs.Notifications = val
	return b.c.Notifications
}

func (b *App) GetSelectedFiles() []string {
	return b.selectedFiles
}

func (b *App) ClearSelectedFiles() {
	b.selectedFiles = []string{}
}

func (b *App) GetReceivedFile() string {
	return b.receivedFile
}

func (b *App) GetUserPrefs() settings.UserSettings {
	return b.UserPrefs
}

func (b *App) SetSelfUpdateParam(val bool) bool {
	b.UserPrefs.SelfUpdate = val
	return b.UserPrefs.SelfUpdate
}

func (b *App) ShowErrorDialog(message string) {
	buttons := []string{"Ok"}
	opts := runtime.MessageDialogOptions{Title: "Error Occured", Message: message, Buttons: buttons, Type: runtime.ErrorDialog, DefaultButton: "Ok"}
	runtime.MessageDialog(b.ctx, opts)
}

func (b *App) AppInstalledFromPackageManager() bool {
	switch goruntime.GOOS {
	case "windows":
		cmdPath, _ := os.Executable()
		return strings.Contains(cmdPath, "WindowsApps")
	default:
		return false
	}
}
