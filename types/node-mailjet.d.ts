declare module 'node-mailjet' {
    interface MailjetClientOptions {
        apiKey: string;
        apiSecret: string;
    }

    interface Mailjet {
        post: (resource: string, options: { version: string }) => {
            request: (data: any) => Promise<any>;
        };
    }

    function apiConnect(apiKey: string, apiSecret: string): Mailjet;
    function connect(apiKey: string, apiSecret: string): Mailjet;

    export default {
        apiConnect,
        connect,
    };
}