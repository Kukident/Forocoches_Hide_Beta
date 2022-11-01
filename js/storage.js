var customStorage = {
    sync : {
        getBrowserStorage: function () {
            console.log(navigator.vendor)
            if (navigator.vendor.includes('Google')) {
                return chrome;
            }
        },
        get: function (key, callback) {
            this.getBrowserStorage().storage.sync.get(key, callback);
        },
        set: function (data, callback) {
            this.getBrowserStorage().storage.sync.set(data, callback);
        },
        clear: function () {
            this.getBrowserStorage().storage.sync.clear();
        },
        remove: function (keys) {
            this.getBrowserStorage().storage.sync.remove(keys);
        }
    }
}