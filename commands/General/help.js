const Command = require('../../base/Command.js');
const { toProperCase } = require('../../util/Util.js');
const { EmbedBuilder } = require('discord.js');

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

    const em = new EmbedBuilder()
      .setAuthor({ name: msg.author.username, iconURL: msg.author.displayAvatarURL() });

    const errEm = new EmbedBuilder()
      .setColor('#FFA500')
      .setDescription(`Please select a category to see all available commands. \nUsage: \`${msg.settings.prefix}help <category>\` \nUsage: \`${msg.settings.prefix}help <command>\``)
      .addFields([
        { name: 'Current Categories:', value: level >= 8 ? allcats.join(', ') : cats.join(', ') },
        { name: 'Quick Bits', value: '[Invite Link](https://cisn.xyz/mythical)' }
      ]);

    if (!args || args.length < 1) return msg.channel.send({ embeds: [errEm] });

    const category = toProperCase(args.join(' '));
    em.setTitle(`${category} Commands`);
    em.setColor('#0099CC');
    const myCommands = this.client.commands.filter(cmd => this.client.levelCache[cmd.conf.permLevel] <= level);
    const myC = [...myCommands.values()];
    const sorted = myC.sort((p, c) => p.help.category > c.help.category ? 1 : p.help.name > c.help.name && p.help.category === c.help.category ? 1 : -1);
    sorted.forEach(c => {
      const cat = toProperCase(c.help.category);
      if (category === cat) em.addFields([{ name: `${msg.settings.prefix}${toProperCase(c.help.name)}`, value: `${c.help.description}` }]);
    });
    if (em.fields < 1) {
      let command = category.toLowerCase();
      command = this.client.commands.get(command) || this.client.commands.get(this.client.aliases.get(command));
      if (command) {
        if (level < this.client.levelCache[command.conf.permLevel]) return;
        em.setTitle(`${toProperCase(command.help.name)} Information`);
        em.setColor('#0099CC');
        em.addFields([
          { name: 'Usage', value: command.help.usage },
          { name: 'Aliases', value: command.conf.aliases.join(', ') || 'none' },
          { mame: 'Guild Only', value: command.conf.guildOnly.toString() },
          { name: 'NSFW', value: command.conf.nsfw.toString() },
          { name: 'Description', value: command.help.description },
          { name: 'Long Description', value: command.help.longDescription }
        ]);
        return msg.channel.send({ embeds: [em] });
      } else return msg.channel.send({ embeds: [errEm] });
    }
    return msg.channel.send({ embeds: [em] });
  }
}

module.exports = Help;
