// Cynhyrchwyd y ffeil hon yn awtomatig. PEIDIWCH Â MODIWL
// This file is automatically generated. DO NOT EDIT
import {settings} from '../models';

export function SendFile(arg1:string):void;

export function SetSelfUpdateParam(arg1:boolean):Promise<boolean>;

export function ShowErrorDialog(arg1:string):void;

export function GetSelectedFiles():Promise<Array<string>>;

export function GetLogPath():Promise<string>;

export function OpenDirectoryDialog():Promise<Array<string>|Error>;

export function SetNotificationsParam(arg1:boolean):Promise<boolean>;

export function UpdateCheckUI():void;

export function VerifyNotificationIcon():Promise<string>;

export function AppInstalledFromPackageManager():Promise<boolean>;

export function GetReceivedFile():Promise<string>;

export function PersistUserSettings():void;

export function SendDirectory(arg1:string):void;

export function SetOverwriteParam(arg1:boolean):Promise<boolean>;

export function GetCurrentVersion():Promise<string>;

export function ClearSelectedFiles():void;

export function GetUserPrefs():Promise<settings.UserSettings>;

export function OpenFile(arg1:string):void;

export function OpenFilesDialog():Promise<Array<string>|Error>;

export function ReceiveFile(arg1:string):void;

export function SelectedFilesSend():void;

export function SetDownloadsFolder():Promise<string>;

export function CancelWormholeRequest():void;

export function UpdateSendProgress(arg1:number,arg2:number):void;
