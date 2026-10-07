"use strict";

/*
    Change this version number whenever the files
    in the app are significantly updated.
*/
const CACHE_NAME = "fiji-reef-guardian-v1";

/*
    These files form the application shell.
    They are downloaded and stored during installation.
*/
const APP_FILES = [
    "./",
    "./index.html",
    "./style.css",
    "./javascript.js",
    "./p5.min.js",
    "./manifest.webmanifest",
    "./icons/icon.svg"
];


/*
    Install the service worker and save all essential
    game files in the browser cache.
*/
self.addEventListener(
    "install",
    event => {
        event.waitUntil(
            caches
                .open(CACHE_NAME)
                .then(cache => {
                    return cache.addAll(
                        APP_FILES
                    );
                })
        );

        self.skipWaiting();
    }
);


/*
    Delete older versions of the app cache.
*/
self.addEventListener(
    "activate",
    event => {
        event.waitUntil(
            caches
                .keys()
                .then(cacheNames => {
                    const deletionPromises =
                        cacheNames
                            .filter(
                                cacheName =>
                                    cacheName !==
                                    CACHE_NAME
                            )
                            .map(
                                cacheName =>
                                    caches.delete(
                                        cacheName
                                    )
                            );

                    return Promise.all(
                        deletionPromises
                    );
                })
        );

        self.clients.claim();
    }
);


/*
    Handle requests from the application.
*/
self.addEventListener(
    "fetch",
    event => {
        const request = event.request;

        /*
            Only manage normal GET requests.
        */
        if (request.method !== "GET") {
            return;
        }

        /*
            For page navigation, try the internet first.
            If offline, use the saved index page.
        */
        if (request.mode === "navigate") {
            event.respondWith(
                fetch(request)
                    .then(response => {
                        const responseCopy =
                            response.clone();

                        caches
                            .open(CACHE_NAME)
                            .then(cache => {
                                cache.put(
                                    request,
                                    responseCopy
                                );
                            });

                        return response;
                    })
                    .catch(() => {
                        return caches.match(
                            "./index.html"
                        );
                    })
            );

            return;
        }

        /*
            For CSS, JavaScript, icons and other assets,
            use the cache first.

            If an item is not cached, request it from
            the network and then save it.
        */
        event.respondWith(
            caches
                .match(request)
                .then(cachedResponse => {
                    if (cachedResponse) {
                        return cachedResponse;
                    }

                    return fetch(request)
                        .then(response => {
                            /*
                                Do not cache failed
                                responses.
                            */
                            if (
                                !response ||
                                response.status !== 200
                            ) {
                                return response;
                            }

                            const responseCopy =
                                response.clone();

                            caches
                                .open(CACHE_NAME)
                                .then(cache => {
                                    cache.put(
                                        request,
                                        responseCopy
                                    );
                                });

                            return response;
                        });
                })
        );
    }
);