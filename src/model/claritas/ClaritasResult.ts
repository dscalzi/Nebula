export interface ClaritasModuleMetadata {
    
    /**
     * Present on ForgeMods
     */
    id?: string
    /**
     * Always Present
     */
    group: string
    /**
     * Possibly present on ForgeMods 1.12-
     */
    version?: string
    /**
     * Possibly present on ForgeMods 1.12-
     */
    name?: string

}

export interface ClaritasResult {

    [jarPath: string]: ClaritasModuleMetadata | undefined

}