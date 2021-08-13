const Command = require('../../base/Command.js');
const { toProperCase } = require('../../base/Util.js');
const { MessageEmbed } = require('discord.js');

class Help extends Command {
  constructor (client) {
    super(client, {
      name: 'help',
      description: 'Displays all the available commands for you.',
      category: 'General',
      usage: 'help <category | command>',
      aliases: ['h']
    });
  }

  async run (msg, args, level) {
    const cats = ['Administrator', 'Economy', 'Fun', 'Games', 'General', 'Information', 'Logging', 'Memes', 'Minecraft', 'Moderator', 'Music', 'NSFW', 'Search', 'Tickets'];
    const allcats = ['Bot Admin', 'Administrator', 'Crafters Island', 'Economy', 'Fun', 'Games', 'General', 'Information', 'Logging', 'Memes', 'Minecraft', 'Moderator', 'Music', 'NSFW', 'Owner', 'Search', 'Tickets'];

    const em = new MessageEmbed()
      .setAuthor(msg.author.username, msg.author.displayAvatarURL());

    const errEm = new MessageEmbed()
      .setColor('ORANGE')
      .setDescription(`Please select a category to see all available commands. \nUsage: \`${msg.settings.prefix}help <category>\` \nUsage: \`${msg.settings.prefix}help <command>\``)
      .addField('Current Categories:', level >= 8 ? allcats.join(', ') : cats.join(', '), true)
      .addField('Quick Bits', '[Invite Link](https://cisn.xyz/mythical)', true);

    if (!args || args.length < 1) return msg.channel.send({embeds: [errEm]});

    const category = toProperCase(args.join(' '));
    em.setTitle(`${category} Commands`);
    em.setColor('0099CC');
    const myCommands = this.client.commands.filter(cmd => this.client.levelCache[cmd.conf.permLevel] <= level);
    const sorted = myCommands.array().sort((p, c) => p.help.category > c.help.category ? 1 : p.help.name > c.help.name && p.help.category === c.help.category ? 1 : -1);
    sorted.forEach(c => {
      const cat = toProperCase(c.help.category);
      if (category === cat) em.addField(`${msg.settings.prefix}${toProperCase(c.help.name)}`, `${c.help.description}`, false);
    });
    if (em.fields < 1) {
      let command = category.toLowerCase();
      command = this.client.commands.get(command) || this.client.commands.get(this.client.aliases.get(command));
      if (command) {
        if (level < this.client.levelCache[command.conf.permLevel]) return;
        em.setTitle(`${toProperCase(command.help.name)} Information`);
        em.setColor('0099CC');
        em.addField('Usage', command.help.usage, false);
        em.addField('Aliases', command.conf.aliases.join(', ') || 'none', false);
        em.addField('Guild Only', command.conf.guildOnly, true);
        em.addField('NSFW', command.conf.nsfw, true);
        em.addField('Description', command.help.description, false);
        em.addField('Long Description', command.help.longDescription, false);
        return msg.channel.send({embeds: [em]});
      } else return msg.channel.send(errEm);
    }
    return msg.channel.send({ embeds: [em]});
  }
}

module.exports = Help;
