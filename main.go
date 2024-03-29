package main

import (
	"embed"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"runtime"

	"github.com/wailsapp/wails/v2/pkg/options/mac"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/logger"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/windows"

	"riftshare/internal/settings"
	"riftshare/internal/update"
)

//go:embed frontend/dist
var assets embed.FS

//go:embed build/appicon.png
var icon []byte

func main() {

	if runtime.GOOS == "linux" {
		_ = os.Setenv("GDK_BACKEND", "wayland,x11")
		// _ = os.Setenv("GTK_USE_PORTAL", "1")
	}

	settingsDir, ferr := settings.GetSettingsDirectory()
	if ferr != nil {
		log.Fatal("Could not open settings directory")
	}

	if _, err := os.Stat(settingsDir); os.IsNotExist(err) {
		log.Println("No Pref Directory Found, creating..")
		err = os.Mkdir(settingsDir, 0777)
		if err != nil {
			log.Fatal("Could not create settings directory")
		}
	}

	loggerPath := filepath.Join(settingsDir, "riftshare-output.log")
	fileLogger := logger.NewFileLogger(loggerPath)
	defer os.Remove(loggerPath)

	// Create an instance of the app structure
	app := NewApp(loggerPath)

	width, height := settings.GetAppDefaultDimensions()
	// Create application with options
	err := wails.Run(&options.App{
		Title:             "RiftShare",
		Width:             width,
		Height:            height,
		MinWidth:          width,
		MinHeight:         height,
		DisableResize:     false,
		Fullscreen:        false,
		Frameless:         false,
		StartHidden:       false,
		HideWindowOnClose: false,
		RGBA:              &options.RGBA{R: 33, G: 37, B: 43, A: 255},
		Assets:            assets,
		LogLevel:          logger.INFO,
		Logger:            fileLogger,
		OnStartup:         app.startup,
		OnDomReady:        app.domReady,
		OnShutdown:        app.shutdown,
		Bind: []interface{}{
			app,
		},
		// Windows platform specific options
		Windows: &windows.Options{
			WebviewIsTransparent: false,
			WindowIsTranslucent:  false,
			DisableWindowIcon:    true,
		},
		Mac: &mac.Options{
			TitleBar:             mac.TitleBarDefault(),
			Appearance:           mac.NSAppearanceNameDarkAqua,
			WebviewIsTransparent: false,
			WindowIsTranslucent:  false,
			About: &mac.AboutInfo{
				Title:   fmt.Sprintf("RiftShare %v", update.Version),
				Message: "Easy, Secure, Free file sharing",
				Icon:    icon,
			},
		},
	})

	if err != nil {
		log.Fatal(err)
	}
}
