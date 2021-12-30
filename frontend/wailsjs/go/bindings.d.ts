interface go {
  "main": {
    "App": {
		AppInstalledFromPackageManager():Promise<boolean>
		CancelWormholeRequest():Promise<void>
		ClearSelectedFiles():Promise<void>
		GetCurrentVersion():Promise<string>
		GetLogPath():Promise<string>
		GetReceivedFile():Promise<string>
		GetSelectedFiles():Promise<Array<string>>
		GetUserPrefs():Promise<UserSettings>
		OpenDirectoryDialog():Promise<Array<string>|Error>
		OpenFile(arg1:string):Promise<void>
		OpenFilesDialog():Promise<Array<string>|Error>
		PersistUserSettings():Promise<void>
		ReceiveFile(arg1:string):Promise<void>
		SelectedFilesSend():Promise<void>
		SendDirectory(arg1:string):Promise<void>
		SendFile(arg1:string):Promise<void>
		SetDownloadsFolder():Promise<string>
		SetNotificationsParam(arg1:boolean):Promise<boolean>
		SetOverwriteParam(arg1:boolean):Promise<boolean>
		SetSelfUpdateParam(arg1:boolean):Promise<boolean>
		ShowErrorDialog(arg1:string):Promise<void>
		UpdateCheckUI():Promise<void>
		UpdateSendProgress(arg1:number,arg2:number):Promise<void>
    },
  }

}

declare global {
	interface Window {
		go: go;
	}
}
