export class VersionUtil {

    public static readonly MINECRAFT_VERSION_REGEX = /(\d+).(\d+).(\d+)/

    public static isMinecraftVersion(version: string) {
        return VersionUtil.MINECRAFT_VERSION_REGEX.test(version)
    }

    public static getMinecraftVersionComponents(version: string) {
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

}
