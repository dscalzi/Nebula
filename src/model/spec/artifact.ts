export interface Artifact {

    /**
     * The size of the artifact.
     */
    size: number

    /**
     * The MD5 hash of the artifact. This will be used to validate local artifacts.
     */
    MD5: string

    /**
     * The artifact's download url.
     */
    url: string

    /**
     * A relative path to where the file will be saved. This is appended to the base
     * path for the module's declared type.
     * If this is not specified, the path will be resolved based on the module's ID.
     */
    path?: string

}
