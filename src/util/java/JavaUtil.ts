export class JavaUtil {

    public static getJavaExecutable(): string {
        return process.env.JAVA_EXECUTABLE as string
    }

}
