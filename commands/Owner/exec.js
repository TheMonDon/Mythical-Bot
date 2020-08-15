const Command = require('../../base/Command.js');

class Exec extends Command {
  constructor (client) {
    super(client, {
      name: 'exec',
      description: 'Executes stuff',
      category: 'Owner',
      usage: 'exec <expression>',
      aliases: ['ex'],
      permLevel: 'Bot Owner'
    });
  }

  async run (msg, args, level) { // eslint-disable-line no-unused-vars
    const code = args.join(' ');
    
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
