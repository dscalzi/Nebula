import got from 'got'
import { PromotionsSlim } from '../model/forge/promotionsslim'
import { MinecraftVersion } from './MinecraftVersion'
import { LoggerUtil } from './LoggerUtil'

export class VersionUtil {

    private static readonly logger = LoggerUtil.getLogger('VersionUtil')

    public static readonly PROMOTION_TYPE = [
        'recommended',
        'latest'
    ]

    public static readonly MINECRAFT_VERSION_REGEX = /(\d+).(\d+).(\d+)/

    public static isVersionAcceptable(version: MinecraftVersion, acceptable: number[]): boolean {
        if (version.getMajor() === 1) {
            return acceptable.find((element) => version.getMinor() === element) != null
        }
        return false
    }

    public static isOneDotTwelveFG2(libraryVersion: string): boolean {
        const maxFG2 = [14, 23, 5, 2847]
        const verSplit = libraryVersion.split('.').map(v => Number(v))

        for(let i=0; i<maxFG2.length; i++) {
            if(verSplit[i] > maxFG2[i]) {
                return false
            }
        }
        
        return true
    }

    public static isPromotionVersion(version: string): boolean {
        return VersionUtil.PROMOTION_TYPE.indexOf(version.toLowerCase()) > -1
    }

    public static async getPromotionIndex(): Promise<PromotionsSlim> {
        const response = await got.get<PromotionsSlim>({
            method: 'get',
            url: 'https://files.minecraftforge.net/maven/net/minecraftforge/forge/promotions_slim.json',
            responseType: 'json'
        })
        return response.body
    }

    public static getPromotedVersionStrict(index: PromotionsSlim, minecraftVersion: MinecraftVersion, promotion: string): string {
        const workingPromotion = promotion.toLowerCase()
        return index.promos[`${minecraftVersion}-${workingPromotion}`]
    }

    public static async getPromotedForgeVersion(minecraftVersion: MinecraftVersion, promotion: string): Promise<string> {
        const workingPromotion = promotion.toLowerCase()
        const res = await VersionUtil.getPromotionIndex()
        let version = res.promos[`${minecraftVersion}-${workingPromotion}`]
        if (version == null) {
            VersionUtil.logger.warn(`No ${workingPromotion} version found for Forge ${minecraftVersion}.`)
            VersionUtil.logger.warn('Attempting to pull latest version instead.')
            version = res.promos[`${minecraftVersion}-latest`]
            if (version == null) {
                throw new Error(`No latest version found for Forge ${minecraftVersion}.`)
            }
        }
        return version
    }

    public static versionGte(version: string, min: string): boolean {

        if(version === min) {
            return true
        }

        const left = version.split('.').map(x => Number(x))
        const right = min.split('.').map(x => Number(x))

        if(left.length != right.length) {
            throw new Error('Cannot compare mismatched versions.')
        }

        for(let i=0; i<left.length; i++) {
            if(left[i] > right[i]) {
                return true
            }
        }

        return false
    }

}
