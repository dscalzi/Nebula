import { createLogger, format, transports, Logger } from 'winston'
import { SPLAT as SPLAT_Symbol } from 'triple-beam'
import { DateTime } from 'luxon'
import { inspect } from 'util'

// Workaround until fixed.
// https://github.com/winstonjs/logform/issues/111
const SPLAT = SPLAT_Symbol as unknown as string

export class LoggerUtil {

    public static getLogger(label: string): Logger {
        return createLogger({
            format: format.combine(
                format.label(),
                format.colorize(),
                format.label({ label }),
                format.printf(info => {
                    if(info[SPLAT]) {
                        if(info[SPLAT].length === 1 && info[SPLAT][0] instanceof Error) {
                            const err = info[SPLAT][0] as Error
                            if(info.message.length > err.message.length && info.message.endsWith(err.message)) {
                                info.message = info.message.substring(0, info.message.length-err.message.length)
                            }
                        } else if(info[SPLAT].length > 0) {
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            info.message += ' ' + info[SPLAT].map((it: any) => {
                                if(typeof it === 'object' && it != null) {
                                    return inspect(it, false, 4, true)
                                }
                                return it
                            }).join(' ')
                        }
                    }
                    if(typeof info.message === 'object') {
                        info.message = inspect(info.message, false, 4, true)
                    }
                    return `[${DateTime.local().toFormat('yyyy-MM-dd TT').trim()}] [${info.level}] [${info.label}]: ${info.message}${info.stack ? `\n${info.stack}` : ''}`
                })
            ),
            level: 'debug',
            transports: [
                new transports.Console()
            ]
        })
    }

}