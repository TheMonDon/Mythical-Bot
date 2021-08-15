const Command = require('../../base/Command.js');
const { MessageEmbed } = require('discord.js');
const fs = require('fs');

class Grab extends Command {
  constructor (client) {
    super(client, {
      name: 'grab',
      description: 'Get the source code of a command.',
      category: 'Owner',
      usage: 'grab <commandName>',
      permLevel: 'Bot Owner'
    });
  }

  async run (msg, args) {
    const em = new MessageEmbed();
    if (!args || args.length < 1) return em.setDescription('Must provide a command.').setColor('RED') && msg.reply({ embeds: [em] });
    const name = args.join(' ');

    const commands = this.client.commands.get(name) || this.client.commands.get(this.client.aliases.get(name));
    if (!commands) return msg.channel.send(`The requested command '${name}' does not exist!`);

    fs.readFile(`${commands.conf.location}/${commands.help.name}.js`, 'utf8', function (err, data) {
      if (err) return console.log(err);
      const file = Buffer.from(data);
      return msg.channel.send({ files: [{ name: `${commands.help.name}.js`, attachment: file }] });
    });
  }
}

module.exports = Grab;
