var customStorage = {
    sync : {
        getBrowserStorage: function () {
            if (navigator.vendor.includes('Google')) {
                return chrome;
            }
            return browser;
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