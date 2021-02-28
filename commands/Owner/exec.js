const Command = require('../../base/Command.js');

class Exec extends Command {
  constructor (client) {
    super(client, {
      name: 'exec',
      description: 'Executes stuff',
      category: 'Owner',
      usage: 'exec <expression>',
      aliases: ['ex', 'exe'],
      permLevel: 'Bot Owner'
    });
  }

  async run (msg, args, level) {
    const code = args.join(' ');
    if (!code) return msg.channel.send('You must include a code to execute!');
    
    const { exec } = require('child_process');
    exec(code, (err, stdout, stderr) => {
      if (err) {
        msg.channel.send(err, {
          code: 'xl'
        });
      }
      if (stderr) {
        msg.channel.send(stderr, {
          code: 'xl'
        });
      }
      if (stdout) {
        msg.channel.send(stdout, {
          code: 'xl'
        });
      }
      if (!stderr && !stdout) msg.channel.send('Code executed! There is no output.');
    });
    
  }
}

module.exports = Exec;
