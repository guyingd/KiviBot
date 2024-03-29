import { colors } from './colors'

/** KiviBot 规范化输出 */
export const notice = {
  /** 输出 KiviBot 规范化的提示消息 */
  info: (msg: string, newLine = false) => {
    console.log(`${newLine ? '\n' : ''}${colors.cyan('Info:')} ${msg}`)
  },
  /** 输出 KiviBot 规范化的警告消息 */
  warn: (msg: string, newLine = false) => {
    console.log(`${newLine ? '\n' : ''}${colors.yellow('Warn:')} ${msg}`)
  },
  /** 输出 KiviBot 规范化的成功消息 */
  success: (msg: string, newLine = false) => {
    console.log(`${newLine ? '\n' : ''}${colors.green('Sucess:')} ${msg}`)
  },
  /** 输出 KiviBot 规范化的错误消息 */
  error: (msg: string, newLine = false) => {
    console.log(`${newLine ? '\n' : ''}${colors.red('Error:')} ${msg}`)
  }
}
