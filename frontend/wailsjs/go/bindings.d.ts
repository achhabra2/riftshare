interface go {
  "main": {
    "App": {
		CancelWormholeRequest():Promise<void>
		GetCurrentVersion():Promise<string>
		GetDownloadsFolder():Promise<string>
		OpenDialog():Promise<string>
		OpenDirectory():Promise<Array<string>>
		OpenFile(arg1:string):Promise<void>
		ReceiveFile(arg1:string):Promise<void>
		SelectedFilesSend():Promise<void>
		SendDirectory(arg1:string):Promise<void>
		SendFile(arg1:string):Promise<void>
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
