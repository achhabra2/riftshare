package settings

// import (
// 	"syscall"
// )

// var (
// 	user32           = syscall.NewLazyDLL("User32.dll")
// 	getSystemMetrics = user32.NewProc("GetSystemMetrics")
// 	getDpiForSystem  = user32.NewProc("GetDpiForSystem")
// )

// func GetSystemMetrics(nIndex int) int {
// 	index := uintptr(nIndex)
// 	ret, _, _ := getSystemMetrics.Call(index)
// 	return int(ret)
// }

// func GetDpiForSystem() int {
// 	ret, _, _ := getDpiForSystem.Call()
// 	return int(ret)
// }

// const (
// 	SM_CXSCREEN = 0
// 	SM_CYSCREEN = 1
// )

// func GetResolution() (int, int) {
// 	return GetSystemMetrics(SM_CXSCREEN), GetSystemMetrics(SM_CYSCREEN)
// }

// func GetAppDefaultDimensionsBackup() (int, int) {
// 	w := 528.0
// 	h := 440.0
// 	baseDpi := 96.0
// 	currentDpi := float64(GetDpiForSystem())
// 	scalingFactor := currentDpi / baseDpi
// 	w2 := int(w * scalingFactor)
// 	h2 := int(h * scalingFactor)
// 	return w2, h2
// }

func GetAppDefaultDimensions() (int, int) {
	return 528, 440
}
