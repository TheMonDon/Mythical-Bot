const Command = require('../../base/Command.js');
const { MessageEmbed } = require('discord.js');
const fs = require('fs');

class TemplateCMD extends Command {
  constructor (client) {
    super(client, {
      name: 'grab',
      description: 'Get source code from a command.',
      category: 'Owner',
      usage: 'grab <commandName>',
      permLevel: 'Bot Owner'
    });
  }

  async run (message, args) {
    const em = new MessageEmbed();
    if (!args || args.length < 1) return em.setDescription('Must provide a command.').setColor('RED') && message.reply(em);
    const name = args.join(' ');
    console.log(name);

    const commands = this.client.commands.get(name) || this.client.commands.get(this.client.aliases.get(name));
    if (!commands) {
      return message.channel.send(`The requested command '${name}' does not exist!`);
    }
    fs.readFile(`${commands.conf.location}/${commands.help.name}.js`, 'utf8', function (err,data) {
      if (err) return console.log(err);
      const file = Buffer.from(data);
      message.channel.send({ files: [{ name: `${commands.help.name}.js`, attachment: file }]});
    });
  }
}

module.exports = TemplateCMD;