import chalk from 'chalk'
import app from './app.mjs'
import logger from './app/lib/logger.mjs'

app.listen(process.env.PORT, () => {
  if (process.env.NODE_ENV === 'development') {
    logger.info(
      '[express] ' +
        chalk.yellowBright.bold('Street Design AI is starting! ') +
        chalk.whiteBright.bold('Go here in your browser: ') +
        chalk.greenBright.bold(`http://localhost:${process.env.PORT}`)
    )
  } else {
    logger.info(
      '[express]',
      chalk.yellow.bold('Street Design AI is starting!')
    )
  }

  if (process.env.OFFLINE_MODE === 'true') {
    logger.info(
      '[express] ' +
        chalk.cyan.bold('Offline mode is ') +
        chalk.greenBright.bold('ON') +
        chalk.cyan.bold('.')
    )
  }
})
