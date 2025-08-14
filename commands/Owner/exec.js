const Command = require('../../base/Command.js');
const { promisify } = require('util');
const setTimeoutPromise = promisify(setTimeout);

class Exec extends Command {
  constructor(client) {
    super(client, {
      name: 'exec',
      description: 'Executes stuff',
      category: 'Owner',
      permLevel: 'Bot Owner',
      usage: 'exec <expression>',
      aliases: ['ex', 'exe'],
    });
  }

  async run(msg, args) {
    const code = args.join(' ');
    if (!code) return msg.channel.send('You must include a code to execute!');

    const { exec } = require('child_process');
    exec(code, async (err, stdout, stderr) => {
      let text;
      if (err) text = err;
      if (stderr) text = stderr;
      if (stdout) text = stdout;

      if (!text) text = 'Code executed! No output was given.';
      const maxLength = 1980;

      while (text.length > 0) {
        const content = text.substring(0, maxLength);
        text = text.substring(maxLength);

        msg.channel.send(`\`\`\`bash\n${content}\n\`\`\``);
        await setTimeoutPromise(2000);
      }
    });
  }
}

module.exports = Exec;
