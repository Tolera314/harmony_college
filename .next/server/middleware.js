"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(() => {
var exports = {};
exports.id = "middleware";
exports.ids = ["middleware"];
exports.modules = {

/***/ "(middleware)/./middleware.ts":
/*!***********************!*\
  !*** ./middleware.ts ***!
  \***********************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   config: () => (/* binding */ config),\n/* harmony export */   middleware: () => (/* binding */ middleware),\n/* harmony export */   runtime: () => (/* binding */ runtime)\n/* harmony export */ });\n/* harmony import */ var next_server__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/server */ \"(middleware)/./node_modules/next/dist/api/server.js\");\n/* harmony import */ var _src_lib_auth__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @/src/lib/auth */ \"(middleware)/./src/lib/auth.ts\");\n\n\nconst runtime = 'nodejs';\n/**\r\n * Routes that require an authenticated session.\r\n * Add dashboard, admin, profile routes here as they are built.\r\n */ const PROTECTED_ROUTES = [\n    '/dashboard',\n    '/admin',\n    '/profile'\n];\n/**\r\n * Routes only accessible when NOT authenticated.\r\n * Authenticated users are redirected away from these.\r\n */ const AUTH_ONLY_ROUTES = [\n    '/signin',\n    '/apply'\n];\nasync function middleware(req) {\n    const { pathname } = req.nextUrl;\n    const token = req.cookies.get('session')?.value ?? null;\n    const session = token ? await (0,_src_lib_auth__WEBPACK_IMPORTED_MODULE_1__.verifyJWT)(token) : null;\n    const isAuthenticated = session !== null;\n    // Redirect authenticated users away from sign-in / apply\n    if (isAuthenticated && AUTH_ONLY_ROUTES.some((r)=>pathname.startsWith(r))) {\n        return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.redirect(new URL('/', req.url));\n    }\n    // Redirect unauthenticated users away from protected routes\n    if (!isAuthenticated && PROTECTED_ROUTES.some((r)=>pathname.startsWith(r))) {\n        const loginUrl = new URL('/signin', req.url);\n        loginUrl.searchParams.set('from', pathname);\n        return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.redirect(loginUrl);\n    }\n    return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.next();\n}\nconst config = {\n    // Run middleware on all routes except static assets and API\n    matcher: [\n        '/((?!_next/static|_next/image|favicon.ico|api/|uploads/).*)'\n    ]\n};\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKG1pZGRsZXdhcmUpLy4vbWlkZGxld2FyZS50cyIsIm1hcHBpbmdzIjoiOzs7Ozs7OztBQUF3RDtBQUNiO0FBRXBDLE1BQU1FLFVBQVUsU0FBUztBQUVoQzs7O0NBR0MsR0FDRCxNQUFNQyxtQkFBbUI7SUFBQztJQUFjO0lBQVU7Q0FBVztBQUU3RDs7O0NBR0MsR0FDRCxNQUFNQyxtQkFBbUI7SUFBQztJQUFXO0NBQVM7QUFFdkMsZUFBZUMsV0FBV0MsR0FBZ0I7SUFDL0MsTUFBTSxFQUFFQyxRQUFRLEVBQUUsR0FBR0QsSUFBSUUsT0FBTztJQUVoQyxNQUFNQyxRQUFRSCxJQUFJSSxPQUFPLENBQUNDLEdBQUcsQ0FBQyxZQUFZQyxTQUFTO0lBQ25ELE1BQU1DLFVBQVVKLFFBQVEsTUFBTVIsd0RBQVNBLENBQUNRLFNBQVM7SUFFakQsTUFBTUssa0JBQWtCRCxZQUFZO0lBRXBDLHlEQUF5RDtJQUN6RCxJQUFJQyxtQkFBbUJWLGlCQUFpQlcsSUFBSSxDQUFDLENBQUNDLElBQU1ULFNBQVNVLFVBQVUsQ0FBQ0QsS0FBSztRQUMzRSxPQUFPaEIscURBQVlBLENBQUNrQixRQUFRLENBQUMsSUFBSUMsSUFBSSxLQUFLYixJQUFJYyxHQUFHO0lBQ25EO0lBRUEsNERBQTREO0lBQzVELElBQUksQ0FBQ04sbUJBQW1CWCxpQkFBaUJZLElBQUksQ0FBQyxDQUFDQyxJQUFNVCxTQUFTVSxVQUFVLENBQUNELEtBQUs7UUFDNUUsTUFBTUssV0FBVyxJQUFJRixJQUFJLFdBQVdiLElBQUljLEdBQUc7UUFDM0NDLFNBQVNDLFlBQVksQ0FBQ0MsR0FBRyxDQUFDLFFBQVFoQjtRQUNsQyxPQUFPUCxxREFBWUEsQ0FBQ2tCLFFBQVEsQ0FBQ0c7SUFDL0I7SUFFQSxPQUFPckIscURBQVlBLENBQUN3QixJQUFJO0FBQzFCO0FBRU8sTUFBTUMsU0FBUztJQUNwQiw0REFBNEQ7SUFDNURDLFNBQVM7UUFBQztLQUE4RDtBQUMxRSxFQUFFIiwic291cmNlcyI6WyJEOlxcc29saXNcXGNvbGxlZ2VcXG1pZGRsZXdhcmUudHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTmV4dFJlcXVlc3QsIE5leHRSZXNwb25zZSB9IGZyb20gJ25leHQvc2VydmVyJztcclxuaW1wb3J0IHsgdmVyaWZ5SldUIH0gZnJvbSAnQC9zcmMvbGliL2F1dGgnO1xyXG5cclxuZXhwb3J0IGNvbnN0IHJ1bnRpbWUgPSAnbm9kZWpzJztcclxuXHJcbi8qKlxyXG4gKiBSb3V0ZXMgdGhhdCByZXF1aXJlIGFuIGF1dGhlbnRpY2F0ZWQgc2Vzc2lvbi5cclxuICogQWRkIGRhc2hib2FyZCwgYWRtaW4sIHByb2ZpbGUgcm91dGVzIGhlcmUgYXMgdGhleSBhcmUgYnVpbHQuXHJcbiAqL1xyXG5jb25zdCBQUk9URUNURURfUk9VVEVTID0gWycvZGFzaGJvYXJkJywgJy9hZG1pbicsICcvcHJvZmlsZSddO1xyXG5cclxuLyoqXHJcbiAqIFJvdXRlcyBvbmx5IGFjY2Vzc2libGUgd2hlbiBOT1QgYXV0aGVudGljYXRlZC5cclxuICogQXV0aGVudGljYXRlZCB1c2VycyBhcmUgcmVkaXJlY3RlZCBhd2F5IGZyb20gdGhlc2UuXHJcbiAqL1xyXG5jb25zdCBBVVRIX09OTFlfUk9VVEVTID0gWycvc2lnbmluJywgJy9hcHBseSddO1xyXG5cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIG1pZGRsZXdhcmUocmVxOiBOZXh0UmVxdWVzdCkge1xyXG4gIGNvbnN0IHsgcGF0aG5hbWUgfSA9IHJlcS5uZXh0VXJsO1xyXG5cclxuICBjb25zdCB0b2tlbiA9IHJlcS5jb29raWVzLmdldCgnc2Vzc2lvbicpPy52YWx1ZSA/PyBudWxsO1xyXG4gIGNvbnN0IHNlc3Npb24gPSB0b2tlbiA/IGF3YWl0IHZlcmlmeUpXVCh0b2tlbikgOiBudWxsO1xyXG5cclxuICBjb25zdCBpc0F1dGhlbnRpY2F0ZWQgPSBzZXNzaW9uICE9PSBudWxsO1xyXG5cclxuICAvLyBSZWRpcmVjdCBhdXRoZW50aWNhdGVkIHVzZXJzIGF3YXkgZnJvbSBzaWduLWluIC8gYXBwbHlcclxuICBpZiAoaXNBdXRoZW50aWNhdGVkICYmIEFVVEhfT05MWV9ST1VURVMuc29tZSgocikgPT4gcGF0aG5hbWUuc3RhcnRzV2l0aChyKSkpIHtcclxuICAgIHJldHVybiBOZXh0UmVzcG9uc2UucmVkaXJlY3QobmV3IFVSTCgnLycsIHJlcS51cmwpKTtcclxuICB9XHJcblxyXG4gIC8vIFJlZGlyZWN0IHVuYXV0aGVudGljYXRlZCB1c2VycyBhd2F5IGZyb20gcHJvdGVjdGVkIHJvdXRlc1xyXG4gIGlmICghaXNBdXRoZW50aWNhdGVkICYmIFBST1RFQ1RFRF9ST1VURVMuc29tZSgocikgPT4gcGF0aG5hbWUuc3RhcnRzV2l0aChyKSkpIHtcclxuICAgIGNvbnN0IGxvZ2luVXJsID0gbmV3IFVSTCgnL3NpZ25pbicsIHJlcS51cmwpO1xyXG4gICAgbG9naW5Vcmwuc2VhcmNoUGFyYW1zLnNldCgnZnJvbScsIHBhdGhuYW1lKTtcclxuICAgIHJldHVybiBOZXh0UmVzcG9uc2UucmVkaXJlY3QobG9naW5VcmwpO1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuIE5leHRSZXNwb25zZS5uZXh0KCk7XHJcbn1cclxuXHJcbmV4cG9ydCBjb25zdCBjb25maWcgPSB7XHJcbiAgLy8gUnVuIG1pZGRsZXdhcmUgb24gYWxsIHJvdXRlcyBleGNlcHQgc3RhdGljIGFzc2V0cyBhbmQgQVBJXHJcbiAgbWF0Y2hlcjogWycvKCg/IV9uZXh0L3N0YXRpY3xfbmV4dC9pbWFnZXxmYXZpY29uLmljb3xhcGkvfHVwbG9hZHMvKS4qKSddLFxyXG59O1xyXG4iXSwibmFtZXMiOlsiTmV4dFJlc3BvbnNlIiwidmVyaWZ5SldUIiwicnVudGltZSIsIlBST1RFQ1RFRF9ST1VURVMiLCJBVVRIX09OTFlfUk9VVEVTIiwibWlkZGxld2FyZSIsInJlcSIsInBhdGhuYW1lIiwibmV4dFVybCIsInRva2VuIiwiY29va2llcyIsImdldCIsInZhbHVlIiwic2Vzc2lvbiIsImlzQXV0aGVudGljYXRlZCIsInNvbWUiLCJyIiwic3RhcnRzV2l0aCIsInJlZGlyZWN0IiwiVVJMIiwidXJsIiwibG9naW5VcmwiLCJzZWFyY2hQYXJhbXMiLCJzZXQiLCJuZXh0IiwiY29uZmlnIiwibWF0Y2hlciJdLCJpZ25vcmVMaXN0IjpbXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(middleware)/./middleware.ts\n");

/***/ }),

/***/ "(middleware)/./node_modules/next/dist/build/webpack/loaders/next-middleware-loader.js?absolutePagePath=D%3A%5Csolis%5Ccollege%5Cmiddleware.ts&page=%2Fmiddleware&rootDir=D%3A%5Csolis%5Ccollege&matchers=&preferredRegion=&middlewareConfig=e30%3D!":
/*!**********************************************************************************************************************************************************************************************************************************************!*\
  !*** ./node_modules/next/dist/build/webpack/loaders/next-middleware-loader.js?absolutePagePath=D%3A%5Csolis%5Ccollege%5Cmiddleware.ts&page=%2Fmiddleware&rootDir=D%3A%5Csolis%5Ccollege&matchers=&preferredRegion=&middlewareConfig=e30%3D! ***!
  \**********************************************************************************************************************************************************************************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => (/* binding */ nHandler)\n/* harmony export */ });\n/* harmony import */ var next_dist_server_web_globals__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/dist/server/web/globals */ \"(middleware)/./node_modules/next/dist/server/web/globals.js\");\n/* harmony import */ var next_dist_server_web_globals__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_web_globals__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var next_dist_server_web_adapter__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! next/dist/server/web/adapter */ \"(middleware)/./node_modules/next/dist/server/web/adapter.js\");\n/* harmony import */ var next_dist_server_web_adapter__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_web_adapter__WEBPACK_IMPORTED_MODULE_1__);\n/* harmony import */ var _middleware_ts__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./middleware.ts */ \"(middleware)/./middleware.ts\");\n/* harmony import */ var next_dist_client_components_is_next_router_error__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! next/dist/client/components/is-next-router-error */ \"(middleware)/./node_modules/next/dist/client/components/is-next-router-error.js\");\n/* harmony import */ var next_dist_client_components_is_next_router_error__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(next_dist_client_components_is_next_router_error__WEBPACK_IMPORTED_MODULE_3__);\n\n\n// Import the userland code.\n\n\n\nconst mod = {\n    ..._middleware_ts__WEBPACK_IMPORTED_MODULE_2__\n};\nconst handler = mod.middleware || mod.default;\nconst page = \"/middleware\";\nif (typeof handler !== 'function') {\n    throw Object.defineProperty(new Error(`The Middleware \"${page}\" must export a \\`middleware\\` or a \\`default\\` function`), \"__NEXT_ERROR_CODE\", {\n        value: \"E120\",\n        enumerable: false,\n        configurable: true\n    });\n}\n// Middleware will only sent out the FetchEvent to next server,\n// so load instrumentation module here and track the error inside middleware module.\nfunction errorHandledHandler(fn) {\n    return async (...args)=>{\n        try {\n            return await fn(...args);\n        } catch (err) {\n            // In development, error the navigation API usage in runtime,\n            // since it's not allowed to be used in middleware as it's outside of react component tree.\n            if (true) {\n                if ((0,next_dist_client_components_is_next_router_error__WEBPACK_IMPORTED_MODULE_3__.isNextRouterError)(err)) {\n                    err.message = `Next.js navigation API is not allowed to be used in Middleware.`;\n                    throw err;\n                }\n            }\n            const req = args[0];\n            const url = new URL(req.url);\n            const resource = url.pathname + url.search;\n            await (0,next_dist_server_web_globals__WEBPACK_IMPORTED_MODULE_0__.edgeInstrumentationOnRequestError)(err, {\n                path: resource,\n                method: req.method,\n                headers: Object.fromEntries(req.headers.entries())\n            }, {\n                routerKind: 'Pages Router',\n                routePath: '/middleware',\n                routeType: 'middleware',\n                revalidateReason: undefined\n            });\n            throw err;\n        }\n    };\n}\nfunction nHandler(opts) {\n    return (0,next_dist_server_web_adapter__WEBPACK_IMPORTED_MODULE_1__.adapter)({\n        ...opts,\n        page,\n        handler: errorHandledHandler(handler)\n    });\n}\n\n//# sourceMappingURL=middleware.js.map\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKG1pZGRsZXdhcmUpLy4vbm9kZV9tb2R1bGVzL25leHQvZGlzdC9idWlsZC93ZWJwYWNrL2xvYWRlcnMvbmV4dC1taWRkbGV3YXJlLWxvYWRlci5qcz9hYnNvbHV0ZVBhZ2VQYXRoPUQlM0ElNUNzb2xpcyU1Q2NvbGxlZ2UlNUNtaWRkbGV3YXJlLnRzJnBhZ2U9JTJGbWlkZGxld2FyZSZyb290RGlyPUQlM0ElNUNzb2xpcyU1Q2NvbGxlZ2UmbWF0Y2hlcnM9JnByZWZlcnJlZFJlZ2lvbj0mbWlkZGxld2FyZUNvbmZpZz1lMzAlM0QhIiwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0FBQXNDO0FBQ2lCO0FBQ3ZEO0FBQ3dDO0FBQ3lDO0FBQ0k7QUFDckY7QUFDQSxPQUFPLDJDQUFJO0FBQ1g7QUFDQTtBQUNBO0FBQ0E7QUFDQSw2REFBNkQsS0FBSztBQUNsRTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxVQUFVO0FBQ1Y7QUFDQTtBQUNBLGdCQUFnQixJQUFxQztBQUNyRCxvQkFBb0IsbUdBQWlCO0FBQ3JDO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0Esa0JBQWtCLCtGQUFpQztBQUNuRDtBQUNBO0FBQ0E7QUFDQSxhQUFhO0FBQ2I7QUFDQTtBQUNBO0FBQ0E7QUFDQSxhQUFhO0FBQ2I7QUFDQTtBQUNBO0FBQ0E7QUFDZTtBQUNmLFdBQVcscUVBQU87QUFDbEI7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMOztBQUVBIiwic291cmNlcyI6WyIiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IFwibmV4dC9kaXN0L3NlcnZlci93ZWIvZ2xvYmFsc1wiO1xuaW1wb3J0IHsgYWRhcHRlciB9IGZyb20gXCJuZXh0L2Rpc3Qvc2VydmVyL3dlYi9hZGFwdGVyXCI7XG4vLyBJbXBvcnQgdGhlIHVzZXJsYW5kIGNvZGUuXG5pbXBvcnQgKiBhcyBfbW9kIGZyb20gXCIuL21pZGRsZXdhcmUudHNcIjtcbmltcG9ydCB7IGVkZ2VJbnN0cnVtZW50YXRpb25PblJlcXVlc3RFcnJvciB9IGZyb20gXCJuZXh0L2Rpc3Qvc2VydmVyL3dlYi9nbG9iYWxzXCI7XG5pbXBvcnQgeyBpc05leHRSb3V0ZXJFcnJvciB9IGZyb20gXCJuZXh0L2Rpc3QvY2xpZW50L2NvbXBvbmVudHMvaXMtbmV4dC1yb3V0ZXItZXJyb3JcIjtcbmNvbnN0IG1vZCA9IHtcbiAgICAuLi5fbW9kXG59O1xuY29uc3QgaGFuZGxlciA9IG1vZC5taWRkbGV3YXJlIHx8IG1vZC5kZWZhdWx0O1xuY29uc3QgcGFnZSA9IFwiL21pZGRsZXdhcmVcIjtcbmlmICh0eXBlb2YgaGFuZGxlciAhPT0gJ2Z1bmN0aW9uJykge1xuICAgIHRocm93IE9iamVjdC5kZWZpbmVQcm9wZXJ0eShuZXcgRXJyb3IoYFRoZSBNaWRkbGV3YXJlIFwiJHtwYWdlfVwiIG11c3QgZXhwb3J0IGEgXFxgbWlkZGxld2FyZVxcYCBvciBhIFxcYGRlZmF1bHRcXGAgZnVuY3Rpb25gKSwgXCJfX05FWFRfRVJST1JfQ09ERVwiLCB7XG4gICAgICAgIHZhbHVlOiBcIkUxMjBcIixcbiAgICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICAgIH0pO1xufVxuLy8gTWlkZGxld2FyZSB3aWxsIG9ubHkgc2VudCBvdXQgdGhlIEZldGNoRXZlbnQgdG8gbmV4dCBzZXJ2ZXIsXG4vLyBzbyBsb2FkIGluc3RydW1lbnRhdGlvbiBtb2R1bGUgaGVyZSBhbmQgdHJhY2sgdGhlIGVycm9yIGluc2lkZSBtaWRkbGV3YXJlIG1vZHVsZS5cbmZ1bmN0aW9uIGVycm9ySGFuZGxlZEhhbmRsZXIoZm4pIHtcbiAgICByZXR1cm4gYXN5bmMgKC4uLmFyZ3MpPT57XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICByZXR1cm4gYXdhaXQgZm4oLi4uYXJncyk7XG4gICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgLy8gSW4gZGV2ZWxvcG1lbnQsIGVycm9yIHRoZSBuYXZpZ2F0aW9uIEFQSSB1c2FnZSBpbiBydW50aW1lLFxuICAgICAgICAgICAgLy8gc2luY2UgaXQncyBub3QgYWxsb3dlZCB0byBiZSB1c2VkIGluIG1pZGRsZXdhcmUgYXMgaXQncyBvdXRzaWRlIG9mIHJlYWN0IGNvbXBvbmVudCB0cmVlLlxuICAgICAgICAgICAgaWYgKHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSAncHJvZHVjdGlvbicpIHtcbiAgICAgICAgICAgICAgICBpZiAoaXNOZXh0Um91dGVyRXJyb3IoZXJyKSkge1xuICAgICAgICAgICAgICAgICAgICBlcnIubWVzc2FnZSA9IGBOZXh0LmpzIG5hdmlnYXRpb24gQVBJIGlzIG5vdCBhbGxvd2VkIHRvIGJlIHVzZWQgaW4gTWlkZGxld2FyZS5gO1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBlcnI7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgcmVxID0gYXJnc1swXTtcbiAgICAgICAgICAgIGNvbnN0IHVybCA9IG5ldyBVUkwocmVxLnVybCk7XG4gICAgICAgICAgICBjb25zdCByZXNvdXJjZSA9IHVybC5wYXRobmFtZSArIHVybC5zZWFyY2g7XG4gICAgICAgICAgICBhd2FpdCBlZGdlSW5zdHJ1bWVudGF0aW9uT25SZXF1ZXN0RXJyb3IoZXJyLCB7XG4gICAgICAgICAgICAgICAgcGF0aDogcmVzb3VyY2UsXG4gICAgICAgICAgICAgICAgbWV0aG9kOiByZXEubWV0aG9kLFxuICAgICAgICAgICAgICAgIGhlYWRlcnM6IE9iamVjdC5mcm9tRW50cmllcyhyZXEuaGVhZGVycy5lbnRyaWVzKCkpXG4gICAgICAgICAgICB9LCB7XG4gICAgICAgICAgICAgICAgcm91dGVyS2luZDogJ1BhZ2VzIFJvdXRlcicsXG4gICAgICAgICAgICAgICAgcm91dGVQYXRoOiAnL21pZGRsZXdhcmUnLFxuICAgICAgICAgICAgICAgIHJvdXRlVHlwZTogJ21pZGRsZXdhcmUnLFxuICAgICAgICAgICAgICAgIHJldmFsaWRhdGVSZWFzb246IHVuZGVmaW5lZFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB0aHJvdyBlcnI7XG4gICAgICAgIH1cbiAgICB9O1xufVxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gbkhhbmRsZXIob3B0cykge1xuICAgIHJldHVybiBhZGFwdGVyKHtcbiAgICAgICAgLi4ub3B0cyxcbiAgICAgICAgcGFnZSxcbiAgICAgICAgaGFuZGxlcjogZXJyb3JIYW5kbGVkSGFuZGxlcihoYW5kbGVyKVxuICAgIH0pO1xufVxuXG4vLyMgc291cmNlTWFwcGluZ1VSTD1taWRkbGV3YXJlLmpzLm1hcFxuIl0sIm5hbWVzIjpbXSwiaWdub3JlTGlzdCI6W10sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(middleware)/./node_modules/next/dist/build/webpack/loaders/next-middleware-loader.js?absolutePagePath=D%3A%5Csolis%5Ccollege%5Cmiddleware.ts&page=%2Fmiddleware&rootDir=D%3A%5Csolis%5Ccollege&matchers=&preferredRegion=&middlewareConfig=e30%3D!\n");

/***/ }),

/***/ "(middleware)/./src/lib/auth.ts":
/*!*************************!*\
  !*** ./src/lib/auth.ts ***!
  \*************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   signJWT: () => (/* binding */ signJWT),\n/* harmony export */   verifyJWT: () => (/* binding */ verifyJWT)\n/* harmony export */ });\n/* harmony import */ var jose__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! jose */ \"(middleware)/./node_modules/jose/dist/webapi/jwt/sign.js\");\n/* harmony import */ var jose__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! jose */ \"(middleware)/./node_modules/jose/dist/webapi/jwt/verify.js\");\n\nconst JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-at-least-32-chars-long';\nconst key = new TextEncoder().encode(JWT_SECRET);\nasync function signJWT(payload) {\n    return await new jose__WEBPACK_IMPORTED_MODULE_0__.SignJWT(payload).setProtectedHeader({\n        alg: 'HS256'\n    }).setIssuedAt().setExpirationTime('7d').sign(key);\n}\nasync function verifyJWT(token) {\n    try {\n        const { payload } = await (0,jose__WEBPACK_IMPORTED_MODULE_1__.jwtVerify)(token, key, {\n            algorithms: [\n                'HS256'\n            ]\n        });\n        return payload;\n    } catch (error) {\n        return null;\n    }\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKG1pZGRsZXdhcmUpLy4vc3JjL2xpYi9hdXRoLnRzIiwibWFwcGluZ3MiOiI7Ozs7Ozs7QUFBMEM7QUFFMUMsTUFBTUUsYUFBYUMsUUFBUUMsR0FBRyxDQUFDRixVQUFVLElBQUk7QUFDN0MsTUFBTUcsTUFBTSxJQUFJQyxjQUFjQyxNQUFNLENBQUNMO0FBRTlCLGVBQWVNLFFBQVFDLE9BQVk7SUFDeEMsT0FBTyxNQUFNLElBQUlULHlDQUFPQSxDQUFDUyxTQUN0QkMsa0JBQWtCLENBQUM7UUFBRUMsS0FBSztJQUFRLEdBQ2xDQyxXQUFXLEdBQ1hDLGlCQUFpQixDQUFDLE1BQ2xCQyxJQUFJLENBQUNUO0FBQ1Y7QUFFTyxlQUFlVSxVQUFVQyxLQUFhO0lBQzNDLElBQUk7UUFDRixNQUFNLEVBQUVQLE9BQU8sRUFBRSxHQUFHLE1BQU1SLCtDQUFTQSxDQUFDZSxPQUFPWCxLQUFLO1lBQzlDWSxZQUFZO2dCQUFDO2FBQVE7UUFDdkI7UUFDQSxPQUFPUjtJQUNULEVBQUUsT0FBT1MsT0FBTztRQUNkLE9BQU87SUFDVDtBQUNGIiwic291cmNlcyI6WyJEOlxcc29saXNcXGNvbGxlZ2VcXHNyY1xcbGliXFxhdXRoLnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFNpZ25KV1QsIGp3dFZlcmlmeSB9IGZyb20gJ2pvc2UnO1xuXG5jb25zdCBKV1RfU0VDUkVUID0gcHJvY2Vzcy5lbnYuSldUX1NFQ1JFVCB8fCAnZmFsbGJhY2stc2VjcmV0LWtleS1hdC1sZWFzdC0zMi1jaGFycy1sb25nJztcbmNvbnN0IGtleSA9IG5ldyBUZXh0RW5jb2RlcigpLmVuY29kZShKV1RfU0VDUkVUKTtcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHNpZ25KV1QocGF5bG9hZDogYW55KSB7XG4gIHJldHVybiBhd2FpdCBuZXcgU2lnbkpXVChwYXlsb2FkKVxuICAgIC5zZXRQcm90ZWN0ZWRIZWFkZXIoeyBhbGc6ICdIUzI1NicgfSlcbiAgICAuc2V0SXNzdWVkQXQoKVxuICAgIC5zZXRFeHBpcmF0aW9uVGltZSgnN2QnKVxuICAgIC5zaWduKGtleSk7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB2ZXJpZnlKV1QodG9rZW46IHN0cmluZykge1xuICB0cnkge1xuICAgIGNvbnN0IHsgcGF5bG9hZCB9ID0gYXdhaXQgand0VmVyaWZ5KHRva2VuLCBrZXksIHtcbiAgICAgIGFsZ29yaXRobXM6IFsnSFMyNTYnXSxcbiAgICB9KTtcbiAgICByZXR1cm4gcGF5bG9hZDtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuIl0sIm5hbWVzIjpbIlNpZ25KV1QiLCJqd3RWZXJpZnkiLCJKV1RfU0VDUkVUIiwicHJvY2VzcyIsImVudiIsImtleSIsIlRleHRFbmNvZGVyIiwiZW5jb2RlIiwic2lnbkpXVCIsInBheWxvYWQiLCJzZXRQcm90ZWN0ZWRIZWFkZXIiLCJhbGciLCJzZXRJc3N1ZWRBdCIsInNldEV4cGlyYXRpb25UaW1lIiwic2lnbiIsInZlcmlmeUpXVCIsInRva2VuIiwiYWxnb3JpdGhtcyIsImVycm9yIl0sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(middleware)/./src/lib/auth.ts\n");

/***/ }),

/***/ "../app-render/action-async-storage.external":
/*!*******************************************************************************!*\
  !*** external "next/dist/server/app-render/action-async-storage.external.js" ***!
  \*******************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/server/app-render/action-async-storage.external.js");

/***/ }),

/***/ "../app-render/after-task-async-storage.external":
/*!***********************************************************************************!*\
  !*** external "next/dist/server/app-render/after-task-async-storage.external.js" ***!
  \***********************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/server/app-render/after-task-async-storage.external.js");

/***/ }),

/***/ "../app-render/work-async-storage.external":
/*!*****************************************************************************!*\
  !*** external "next/dist/server/app-render/work-async-storage.external.js" ***!
  \*****************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/server/app-render/work-async-storage.external.js");

/***/ }),

/***/ "../app-render/work-unit-async-storage.external":
/*!**********************************************************************************!*\
  !*** external "next/dist/server/app-render/work-unit-async-storage.external.js" ***!
  \**********************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/server/app-render/work-unit-async-storage.external.js");

/***/ }),

/***/ "../lib/cache-handlers/default.external":
/*!**************************************************************************!*\
  !*** external "next/dist/server/lib/cache-handlers/default.external.js" ***!
  \**************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/server/lib/cache-handlers/default.external.js");

/***/ }),

/***/ "next/dist/compiled/next-server/app-page.runtime.dev.js":
/*!*************************************************************************!*\
  !*** external "next/dist/compiled/next-server/app-page.runtime.dev.js" ***!
  \*************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/compiled/next-server/app-page.runtime.dev.js");

/***/ }),

/***/ "node:async_hooks":
/*!***********************************!*\
  !*** external "node:async_hooks" ***!
  \***********************************/
/***/ ((module) => {

module.exports = require("node:async_hooks");

/***/ })

};
;

// load runtime
var __webpack_require__ = require("./webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = __webpack_require__.X(0, ["vendor-chunks/next","vendor-chunks/jose"], () => (__webpack_exec__("(middleware)/./node_modules/next/dist/build/webpack/loaders/next-middleware-loader.js?absolutePagePath=D%3A%5Csolis%5Ccollege%5Cmiddleware.ts&page=%2Fmiddleware&rootDir=D%3A%5Csolis%5Ccollege&matchers=&preferredRegion=&middlewareConfig=e30%3D!")));
module.exports = __webpack_exports__;

})();