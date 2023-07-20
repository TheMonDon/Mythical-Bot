const Command = require('../../base/Command.js');
const fs = require('fs');

class Grab extends Command {
  constructor(client) {
    super(client, {
      name: 'grab',
      description: 'Get the source code of a command.',
      category: 'Owner',
      permLevel: 'Bot Owner',
      usage: 'grab [-i] <commandName>',
      requiredArgs: 1,
    });
  }

  async run(msg, args) {
    const name = args.join(' ').toLowerCase();

    let command;

    if (args.length === 2 && args[0].toLowerCase() === '-i') {
      const name = args[1].toLowerCase();
      command = this.client.slashCommands.get(name);
    } else {
      command = this.client.commands.get(name) || this.client.commands.get(this.client.aliases.get(name));
    }

    if (!command) return msg.channel.send(`The requested command '${name}' does not exist!`);

    fs.readFile(command.conf.location, 'utf8', function (err, data) {
      if (err) {
        msg.channel.send('There was an error grabbing that command.');
        return this.client.logger.error(err);
      }
      const file = Buffer.from(data);
      return msg.channel.send({ files: [{ name: `${command.help.name}.js`, attachment: file }] });
    });
  }
}

module.exports = Grab;
