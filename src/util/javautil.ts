export class JavaUtil {

    public static getJavaExecutable() {
        return process.env.JAVA_EXECUTABLE as string
    }

}
