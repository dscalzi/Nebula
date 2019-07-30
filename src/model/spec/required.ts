export interface Required {

    /**
     * If the module is required. Defaults to true if this property is omited.
     */
    value?: boolean

    /**
     * If the module is enabled by default. Has no effect unless Required.value
     * is false. Defaults to true if this property is omited.
     */
    def?: boolean

}
