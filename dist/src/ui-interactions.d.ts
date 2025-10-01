export declare class UIInteractions {
    clickElement(args: any): Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
    typeText(args: any): Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
    getElementText(args: any): Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
    getElementAttribute(args: any): Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
    isElementVisible(args: any): Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
    scrollToElement(args: any): Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
}
export declare const uiInteractions: UIInteractions;
