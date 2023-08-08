const Command = require('../../base/Command.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

class Disable extends Command {
  constructor(client) {
    super(client, {
      name: 'disable',
      description: 'Disable a command or category',
      usage: 'disable <command/category>',
      category: 'Moderator',
      permLevel: 'Moderator',
      guildOnly: true,
      requiredArgs: 1,
    });
  }

  async run(msg, args, level) {
    if (level !== 10) return msg.reply('This command is a work in progress.');
    const baseCategories = [
      'Economy',
      'Fun',
      'Games',
      'General',
      'Giveaways',
      'Information',
      'Minecraft',
      'Music',
      'Nsfw',
      'Search',
      'Tickets',
    ];
    const shortCategories = {
      admin: 'Administrator',
      admins: 'Administrator',
      eco: 'Economy',
      gen: 'General',
      mc: 'Minecraft',
      mod: 'Moderator',
      mods: 'Moderator',
      info: 'Information',
      ticket: 'Tickets',
    };

    const disabled = (await db.get(`servers.${msg.guild.id}.disabled`)) || [];
    if (disabled.includes(args[0])) return msg.reply('This command or category is already disabled.');

    const command = this.client.commands.get(args[0]);

    if (command) {
      const bannedPermLevels = ['Moderator', 'Administrator', 'Bot Admin', 'Bot Owner', 'Bot Support'];
      if (bannedPermLevels.includes(command.permLevel))
        return msg.reply("You can't disable a command with that permission level");
      if (!baseCategories.includes(command.help.category))
        return msg.reply("You can't disable a command in that category.");

      await db.push(`servers.${msg.guild.id}.disabled`, command.help.name);
      this.client.settings.setProp(msg.guild.id, 'disabledCommands', command.help.name);
      return msg.reply(`The \`${command.help.name}\` command has been disabled.`);
    }

    let category = args.join(' ');
    category = shortCategories[category.toLowerCase()] || this.client.util.toProperCase(category);
    if (!baseCategories.includes(category)) return msg.reply('That is not a valid category');

    await db.push(`servers.${msg.guild.id}.disabled`, category);
    return msg.reply(`The \`${category}\` category has been disabled.`);
  }
}

module.exports = Disable;
