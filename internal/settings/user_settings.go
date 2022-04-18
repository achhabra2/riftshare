package settings

import (
	"errors"
	"log"
	"os"
	"path/filepath"
	"riftshare/internal/transport"
	"riftshare/internal/update"
	"runtime"

	"gopkg.in/yaml.v2"
)

type UserSettings struct {
	Notifications      bool   `yaml:"notifications" json:"notifications"`
	Overwrite          bool   `yaml:"overwrite" json:"overwrite"`
	DownloadsDirectory string `yaml:"downloads_directory" json:"downloadsDirectory"`
	SelfUpdate         bool   `yaml:"self_update" json:"selfUpdate"`
	Version            string `yaml:"version" json:"version"`
}

func getDefaultSettings() UserSettings {
	// Append v to ensure string when converting to yaml
	ver := "v" + update.Version
	settings := UserSettings{Notifications: false, Overwrite: true, DownloadsDirectory: transport.UserDownloadsFolder(), SelfUpdate: true, Version: ver}
	return settings
}

func SaveUserSettings(settings UserSettings) error {
	prefs, err := openPrefFile()
	if err != nil {
		log.Println(err)
		return errors.New("error opening settings file")
	}
	// Clear the prefs file before re-writing
	prefs.Truncate(0)
	defer prefs.Close()
	encoder := yaml.NewEncoder(prefs)
	err = encoder.Encode(settings)
	if err != nil {
		log.Println(err)
		return errors.New("error encoding settings file")
	}
	return nil
}

func GetUserSettings() (UserSettings, error) {
	prefs, err := openPrefFile()
	if err != nil {
		log.Println(err)
		return getDefaultSettings(), err
	}
	defer prefs.Close()

	var settings UserSettings
	decoder := yaml.NewDecoder(prefs)
	err = decoder.Decode(&settings)
	if err != nil {
		log.Println(err)
		// If there is corruption in the yaml file, truncate it
		prefs.Truncate(0)
		return getDefaultSettings(), err
	}

	if settings.Version == "" {
		settings.SelfUpdate = true
	}
	// Check if file is empty
	if settings == (UserSettings{}) {
		// Initialize empty settings file
		settings = getDefaultSettings()
	}
	return settings, nil
}

func GetSettingsDirectory() (string, error) {
	var err error
	homeDir, err := os.UserHomeDir()
	prefDir := ""
	switch runtime.GOOS {
	case "windows":
		prefDir = filepath.Join(homeDir, "/AppData/Local/RiftShare")
	case "darwin":
		prefDir = filepath.Join(homeDir, "/Library/Application Support/RiftShare")
	case "linux":
		prefDir = filepath.Join(homeDir, "~/.var/app/app.riftshare.RiftShare/data")
	default:
		err = errors.New("unsupported platform")
	}
	return prefDir, err
}

func openPrefFile() (*os.File, error) {
	dir, err := GetSettingsDirectory()
	if err != nil {
		log.Println(err)
		return &os.File{}, err
	}
	if _, err := os.Stat(dir); os.IsNotExist(err) {
		log.Println("No Pref Directory Found, creating..")
		err = os.Mkdir(dir, 0777)
		if err != nil {
			// log.Println(err)
			return &os.File{}, err
		}
	}
	settingsPath := filepath.Join(dir, "riftshare_config.yaml")
	prefs, err := os.OpenFile(settingsPath, os.O_RDWR|os.O_CREATE, 0666)
	if err != nil {
		log.Println(err)
		return &os.File{}, err
	}
	return prefs, nil
}
