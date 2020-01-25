import Axios from 'axios'
import { PromotionsSlim } from '../model/forge/promotionsslim'

export class VersionUtil {

    public static readonly PROMOTION_TYPE = [
        'recommended',
        'latest'
    ]

    public static readonly MINECRAFT_VERSION_REGEX = /(\d+).(\d+).(\d+)/

    public static isMinecraftVersion(version: string): boolean {
        return VersionUtil.MINECRAFT_VERSION_REGEX.test(version)
    }

    public static getMinecraftVersionComponents(version: string): { major: number, minor: number, revision: number } {
        if (VersionUtil.isMinecraftVersion(version)) {
            const result = VersionUtil.MINECRAFT_VERSION_REGEX.exec(version)
            if (result != null) {
                return {
                    major: Number(result[1]),
                    minor: Number(result[2]),
                    revision: Number(result[3])
                }
            }
        }
        throw new Error(`${version} is not a valid minecraft version!`)
    }

    public static isVersionAcceptable(version: string, acceptable: number[]): boolean {
        const versionComponents = VersionUtil.getMinecraftVersionComponents(version)
        if (versionComponents != null && versionComponents.major === 1) {
            return acceptable.find((element) => versionComponents.minor === element) != null
        }
        return false
    }

    public static isPromotionVersion(version: string): boolean {
        return VersionUtil.PROMOTION_TYPE.indexOf(version.toLowerCase()) > -1
    }

    public static async getPromotionIndex(): Promise<PromotionsSlim> {
        const response = await Axios({
            method: 'get',
            url: 'https://files.minecraftforge.net/maven/net/minecraftforge/forge/promotions_slim.json',
            responseType: 'json'
        })
        return response.data as PromotionsSlim
    }

    public static getPromotedVersionStrict(index: PromotionsSlim, minecraftVersion: string, promotion: string): string {
        const workingPromotion = promotion.toLowerCase()
        return index.promos[`${minecraftVersion}-${workingPromotion}`]
    }

    public static async getPromotedForgeVersion(minecraftVersion: string, promotion: string): Promise<string> {
        const workingPromotion = promotion.toLowerCase()
        const res = await VersionUtil.getPromotionIndex()
        let version = res.promos[`${minecraftVersion}-${workingPromotion}`]
        if (version == null) {
            console.warn(`No ${workingPromotion} version found for Forge ${minecraftVersion}.`)
            console.warn('Attempting to pull latest version instead.')
            version = res.promos[`${minecraftVersion}-latest`]
            if (version == null) {
                throw new Error(`No latest version found for Forge ${minecraftVersion}.`)
            }
        }
        return version
    }

}
