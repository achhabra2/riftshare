// Cynhyrchwyd y ffeil hon yn awtomatig. PEIDIWCH Â MODIWL
// This file is automatically generated. DO NOT EDIT
import {settings} from '../models';

export function GetReceivedFile():Promise<string>;

export function SelectedFilesSend():void;

export function SendFile(arg1:string):void;

export function SetDownloadsFolder():Promise<string>;

export function SetSelfUpdateParam(arg1:boolean):Promise<boolean>;

export function ShowErrorDialog(arg1:string):void;

export function UpdateSendProgress(arg1:number,arg2:number):void;

export function AppInstalledFromPackageManager():Promise<boolean>;

export function CancelWormholeRequest():void;

export function ClearSelectedFiles():void;

export function GetUserPrefs():Promise<settings.UserSettings>;

export function OpenDirectoryDialog():Promise<Array<string>|Error>;

export function SendDirectory(arg1:string):void;

export function PersistUserSettings():void;

export function SetNotificationsParam(arg1:boolean):Promise<boolean>;

export function UpdateCheckUI():void;

export function VerifyNotificationIcon():Promise<string>;

export function GetCurrentVersion():Promise<string>;

export function GetLogPath():Promise<string>;

export function GetSelectedFiles():Promise<Array<string>>;

export function OpenFile(arg1:string):void;

export function OpenFilesDialog():Promise<Array<string>|Error>;

export function ReceiveFile(arg1:string):void;

export function SetOverwriteParam(arg1:boolean):Promise<boolean>;
