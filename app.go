package main

import (
	"context"
	"fmt"
	"log"
	"math"
	"os/exec"
	goruntime "runtime"

	"wormhole-wails-gui/transport"

	"github.com/psanford/wormhole-william/wormhole"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// App application struct
type App struct {
	ctx          context.Context
	c            *transport.Client
	selectedFile string
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
		// runtime.LogInfo(b.ctx, "Error opening dialog")
	}
	// runtime.LogInfo(b.ctx, "File Selected:"+selection)
	b.selectedFile = selection
	return selection
}

func (b *App) OpenDirectory() string {
	// selection, err := runtime.OpenDirectoryDialog(b.ctx, )

	return ""
}

func (b *App) SendFile() {
	runtime.LogInfo(b.ctx, "Sending File: "+b.selectedFile)
	runtime.EventsEmit(b.ctx, "send:status", "sending")
	go func() {
		code, status, err := b.c.NewFileSend(b.selectedFile, wormhole.WithProgress(b.UpdateSendProgress))
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
