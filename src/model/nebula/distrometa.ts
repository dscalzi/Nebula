import { Distribution } from 'helios-distribution-types'

export interface DistroMeta {

    meta: {
        rss: Distribution['rss']
        discord?: Distribution['discord']
    }

}

export function getDefaultDistroMeta(): DistroMeta {

    return {

        meta: {
            rss: '<LINK TO RSS FEED>',
            discord: {
                clientId: '<FILL IN OR REMOVE DISCORD OBJECT>',
                smallImageText: '<FILL IN OR REMOVE DISCORD OBJECT>',
                smallImageKey: '<FILL IN OR REMOVE DISCORD OBJECT>'
            }
        }
        
    }

}