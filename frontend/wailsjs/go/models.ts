/* Do not change, this code is generated from Golang structs */

export {};

export class UserSettings {
    notifications: boolean;
    overwrite: boolean;
    downloadsDirectory: string;
    selfUpdate: boolean;

    static createFrom(source: any = {}) {
        return new UserSettings(source);
    }

    constructor(source: any = {}) {
        if ('string' === typeof source) source = JSON.parse(source);
        this.notifications = source["notifications"];
        this.overwrite = source["overwrite"];
        this.downloadsDirectory = source["downloadsDirectory"];
        this.selfUpdate = source["selfUpdate"];
    }
}