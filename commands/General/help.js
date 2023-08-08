const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');

class Help extends Command {
  constructor(client) {
    super(client, {
      name: 'help',
      description: 'Displays all the available commands for you.',
      category: 'General',
      usage: 'Help <Category || Command>',
      examples: ['help games', 'help user-info'],
      aliases: ['h'],
    });
  }

  async run(msg, args, level) {
    const baseCategories = [
      'Economy',
      'Fun',
      'Games',
      'General',
      'Giveaways',
      'Information',
      'Minecraft',
      'Music',
      'NSFW',
      'Search',
      'Tickets',
    ];
    const modCategories = ['Moderator', 'Logging'];
    const adminCategories = ['Administrator'];
    const botSupportCategories = ['Bot Support'];
    const botAdminCategories = ['Bot Admin'];
    const botOwnerCategories = ['Owner'];

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

    const levelCategories = {
      0: baseCategories,
      2: [...baseCategories, ...modCategories],
      3: [...baseCategories, ...modCategories, ...adminCategories],
      4: [...baseCategories, ...modCategories, ...adminCategories],
      8: [...baseCategories, ...modCategories, ...adminCategories, ...botSupportCategories],
      9: [...baseCategories, ...modCategories, ...adminCategories, ...botSupportCategories, ...botAdminCategories],
      10: [
        ...baseCategories,
        ...modCategories,
        ...adminCategories,
        ...botSupportCategories,
        ...botAdminCategories,
        ...botOwnerCategories,
      ],
    };

    const categoriesForLevel = levelCategories[level];
    const sortedCategories = categoriesForLevel.sort().join(', ');
    const itemsPerPage = 25;
    let pageNumber = 1;

    const errEm = new EmbedBuilder()
      .setColor('#FFA500')
      .setDescription(
        `Please select a category to see all available commands. \nUsage: \`${msg.settings.prefix}help <category>\` \nUsage: \`${msg.settings.prefix}help <command>\``,
      )
      .addFields([
        { name: 'Current Categories:', value: sortedCategories },
        {
          name: 'Quick Bits',
          value:
            '[Invite Link](https://cisn.xyz/mythical) \n[Source Code](https://github.com/TheMonDon/Mythical-Bot) \n[Support Server](https://discord.com/invite/XvHzUNZDdR)',
        },
      ]);

    if (!args || args.length < 1) return msg.channel.send({ embeds: [errEm] });

    const em = new EmbedBuilder()
      .setAuthor({ name: msg.author.username, iconURL: msg.author.displayAvatarURL() })
      .setColor(msg.settings.embedColor);

    const userInput = args.join(' ');
    let category = '';

    const categoryPageMatch = userInput.match(/^(.*?) (\d+)$/);
    if (categoryPageMatch) {
      category = categoryPageMatch[1];
      pageNumber = parseInt(categoryPageMatch[2], 10) ?? 1;
    } else {
      category = userInput;
    }

    // Normalize category name
    category = shortCategories[category.toLowerCase()] || this.client.util.toProperCase(category);
    if (!category || !categoriesForLevel.includes(category)) {
      let command = userInput.toLowerCase();
      command = this.client.commands.get(command) || this.client.commands.get(this.client.aliases.get(command));

      if (command) {
        if (level < this.client.levelCache[command.conf.permLevel]) return;
        em.setTitle(`${this.client.util.toProperCase(command.help.name)} Information`)
          .setColor(msg.settings.embedColor)
          .addFields([
            { name: 'Usage', value: command.help.usage, inline: true },
            { name: 'Aliases', value: command.conf.aliases.join(', ') || 'None', inline: true },
            { name: 'Guild Only', value: command.conf.guildOnly.toString() || 'False', inline: true },
            { name: 'NSFW', value: command.conf.nsfw.toString() || 'False', inline: true },
            { name: 'Description', value: command.help.description || 'None', inline: true },
            { name: 'Long Description', value: command.help.longDescription || 'None', inline: true },
            { name: 'Examples', value: command.help.examples?.join('\n') || 'None', inline: true },
          ]);
        return msg.channel.send({ embeds: [em] });
      } else {
        return msg.channel.send({ embeds: [errEm] });
      }
    }

    const myCommands = this.client.commands.filter((cmd) => this.client.levelCache[cmd.conf.permLevel] <= level);
    const myC = [...myCommands.values()];
    const sorted = myC.sort((p, c) =>
      p.help.category > c.help.category ? 1 : p.help.name > c.help.name && p.help.category === c.help.category ? 1 : -1,
    );

    const commandsToShow = sorted.filter((c) => this.client.util.toProperCase(c.help.category) === category);

    const totalPages = Math.ceil(commandsToShow.length / itemsPerPage);
    pageNumber = Math.max(1, Math.min(pageNumber, totalPages));
    if (pageNumber > totalPages) pageNumber = totalPages;

    const startIndex = (pageNumber - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;

    const commandsToDisplay = commandsToShow.slice(startIndex, endIndex);

    if (commandsToDisplay.length > 0) {
      em.setTitle(`${category} Commands`);
      commandsToDisplay.forEach((c) => {
        em.addFields([
          {
            name: `${msg.settings.prefix}${this.client.util.toProperCase(c.help.name)}`,
            value: `${c.help.description}`,
            inline: true,
          },
        ]);
      });

      em.setFooter({ text: `Page ${pageNumber}/${totalPages}` });
      msg.channel.send({ embeds: [em] });
    } else {
      return msg.channel.send({ embeds: [errEm] });
    }
  }
}

module.exports = Help;
