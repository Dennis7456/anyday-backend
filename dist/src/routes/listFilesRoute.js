"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerIndexRoute = registerIndexRoute;
function registerIndexRoute(server) {
    // Server Status Endpoint
    server.route({
        method: 'GET',
        url: '/',
        handler: (req, resp) => __awaiter(this, void 0, void 0, function* () {
            try {
                resp.status(200).send('Server is running!');
            }
            catch (error) {
                console.error('Error:', error);
                resp.status(500).send('Internal Server Error');
            }
        }),
    });
}
