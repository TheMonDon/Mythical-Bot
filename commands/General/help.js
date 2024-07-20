const Command = require('../../base/Command.js');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');

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
      'economy',
      'fun',
      'games',
      'general',
      'giveaways',
      'information',
      'minecraft',
      'music',
      'nsfw',
      'search',
      'tickets',
    ];
    const modCategories = ['moderator', 'logging'];
    const adminCategories = ['administrator'];
    const botSupportCategories = ['bot support'];
    const botAdminCategories = ['bot admin'];
    const botOwnerCategories = ['owner'];

    const shortCategories = {
      admin: 'administrator',
      admins: 'administrator',
      eco: 'economy',
      gen: 'general',
      logs: 'logging',
      mc: 'minecraft',
      mod: 'moderator',
      mods: 'moderator',
      info: 'information',
      ticket: 'tickets',
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

    const split = sortedCategories.split(', ');
    const sortedCategoriesArray = [];
    for (const category of split) {
      let properCase = this.client.util.toProperCase(category);
      if (properCase === 'Nsfw') properCase = 'NSFW';
      sortedCategoriesArray.push(properCase);
    }

    const itemsPerPage = 10;
    let pageNumber = 1;

    const em = new EmbedBuilder()
      .setAuthor({ name: msg.author.username, iconURL: msg.author.displayAvatarURL() })
      .setColor(msg.settings.embedColor);

    const errorEmbed = new EmbedBuilder()
      .setColor('#FFA500')
      .setDescription(
        `Please select a category to see all available commands. \nUsage: \`${msg.settings.prefix}help <category>\` \nUsage: \`${msg.settings.prefix}help <command>\``,
      )
      .addFields([
        { name: 'Current Categories:', value: sortedCategoriesArray.join(', ') },
        {
          name: 'Quick Bits',
          value:
            '[Invite Link](https://cisn.xyz/mythical) \n[Source Code](https://github.com/TheMonDon/Mythical-Bot) \n[Support Server](https://discord.com/invite/XvHzUNZDdR)',
        },
      ]);

    if (!args || args.length < 1) {
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('select')
        .setPlaceholder('Choose a category')
        .addOptions(
          sortedCategoriesArray.map((category) => ({
            label: category,
            value: category.toLowerCase(),
          })),
        );

      const row = new ActionRowBuilder().addComponents(selectMenu);

      const message = await msg.channel.send({
        embeds: [errorEmbed],
        components: [row],
      });

      const filter = (interaction) => interaction.user.id === msg.author.id;
      const collector = msg.channel.createMessageComponentCollector({
        filter,
        time: 60000,
      });

      let currentButtonCollector = null;

      collector.on('collect', async (interaction) => {
        if (!interaction.isStringSelectMenu()) return;
        const selectedCategory = interaction.values[0];

        await interaction.deferUpdate();

        const commandsToShow = this.client.commands.filter(
          (cmd) =>
            this.client.levelCache[cmd.conf.permLevel] <= level && cmd.help.category.toLowerCase() === selectedCategory,
        );

        const commandsArray = Array.from(commandsToShow.values());
        const totalPages = Math.ceil(commandsArray.length / itemsPerPage);
        let pageNumber = 1;

        const updateEmbed = (pageNumber) => {
          const startIndex = (pageNumber - 1) * itemsPerPage;
          const endIndex = startIndex + itemsPerPage;
          const commandsToDisplay = commandsArray.slice(startIndex, endIndex);

          em.setFields([]);
          commandsToDisplay.forEach((c) => {
            em.addFields([
              {
                name: `**${msg.settings.prefix}${this.client.util.toProperCase(c.help.name)}**`,
                value: `${c.help.description}`,
                inline: true,
              },
            ]);
          });

          let displayedCategory = this.client.util.toProperCase(selectedCategory);
          if (displayedCategory === 'Nsfw') displayedCategory = 'NSFW';

          const pageFooter = totalPages === 1 ? '' : `Page ${pageNumber}/${totalPages}`;
          em.setTitle(`${displayedCategory} Commands`);

          if (pageFooter) {
            em.setFooter({
              text: pageFooter,
            });
          }

          const prevButton = new ButtonBuilder()
            .setCustomId('prev_page')
            .setLabel('Previous')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(pageNumber === 1);
          const nextButton = new ButtonBuilder()
            .setCustomId('next_page')
            .setLabel('Next')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(pageNumber === totalPages || totalPages === 0);

          const rowWithButtons = new ActionRowBuilder().addComponents(prevButton, nextButton);

          return { embeds: [em], components: [row, rowWithButtons] };
        };

        await interaction.editReply(updateEmbed(pageNumber));

        if (currentButtonCollector) {
          currentButtonCollector.stop();
          currentButtonCollector = null;
        }

        currentButtonCollector = message.createMessageComponentCollector({
          filter: (btnInteraction) => btnInteraction.user.id === msg.author.id,
          time: 60000,
        });

        currentButtonCollector.on('collect', async (btnInteraction) => {
          if (!btnInteraction.isButton()) return;
          if (btnInteraction.customId === 'prev_page' && pageNumber > 1) {
            pageNumber--;
          } else if (btnInteraction.customId === 'next_page' && pageNumber < totalPages) {
            pageNumber++;
          }

          await btnInteraction.update(updateEmbed(pageNumber));
        });

        currentButtonCollector.on('end', () => {
          currentButtonCollector = null;
        });
      });

      return;
    }

    const userInput = args.join(' ');
    let category = '';

    const categoryPageMatch = userInput.match(/^(.*?) (\d+)$/);
    if (categoryPageMatch) {
      category = categoryPageMatch[1];
      pageNumber = parseInt(categoryPageMatch[2], 10) ?? 1;
    } else {
      category = userInput;
    }

    category = shortCategories[category.toLowerCase()] || category.toLowerCase();

    if (!category || !categoriesForLevel.includes(category)) {
      let command = userInput.toLowerCase();
      command = this.client.commands.get(command) || this.client.commands.get(this.client.aliases.get(command));

      if (command) {
        if (level < this.client.levelCache[command.conf.permLevel])
          return msg.reply("You don't have access to that command.");

        em.setTitle(`${this.client.util.toProperCase(command.help.name)} Information`)
          .setColor(msg.settings.embedColor)
          .addFields([
            { name: 'Usage', value: command.help.usage, inline: true },
            { name: 'Aliases', value: command.conf.aliases.join(', ') || 'None', inline: true },
            { name: 'Description', value: command.help.description || 'None', inline: true },
            {
              name: 'Guild Only',
              value: this.client.util.toProperCase(command.conf.guildOnly.toString()) || 'False',
              inline: true,
            },
            {
              name: 'NSFW',
              value: this.client.util.toProperCase(command.conf.nsfw.toString()) || 'False',
              inline: true,
            },
            { name: 'Long Description', value: command.help.longDescription || 'None', inline: true },
            { name: 'Examples', value: command.help.examples?.join('\n') || 'None', inline: true },
          ]);
        return msg.channel.send({ embeds: [em] });
      } else {
        return msg.channel.send({ embeds: [errorEmbed] });
      }
    }

    const myCommands = this.client.commands.filter((cmd) => this.client.levelCache[cmd.conf.permLevel] <= level);
    const myC = [...myCommands.values()];
    const sorted = myC.sort((p, c) =>
      p.help.category > c.help.category ? 1 : p.help.name > c.help.name && p.help.category === c.help.category ? 1 : -1,
    );

    const commandsToShow = sorted.filter((c) => c.help.category.toLowerCase() === category.toLowerCase());

    const commandsArray = Array.from(commandsToShow);
    const totalPages = Math.ceil(commandsArray.length / itemsPerPage);
    pageNumber = Math.max(1, Math.min(pageNumber, totalPages));
    if (pageNumber > totalPages) pageNumber = totalPages;

    const startIndex = (pageNumber - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;

    const commandsToDisplay = commandsArray.slice(startIndex, endIndex);

    const prevButton = new ButtonBuilder()
      .setCustomId('prev_page')
      .setLabel('Previous')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(pageNumber === 1);
    const nextButton = new ButtonBuilder()
      .setCustomId('next_page')
      .setLabel('Next')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(pageNumber === totalPages || totalPages === 0);

    const rowWithButtons = new ActionRowBuilder().addComponents(prevButton, nextButton);

    if (commandsToDisplay.length > 0) {
      commandsToDisplay.forEach((c) => {
        em.addFields([
          {
            name: `**${msg.settings.prefix}${this.client.util.toProperCase(c.help.name)}**`,
            value: `${c.help.description}`,
            inline: true,
          },
        ]);
      });

      let displayedCategory = this.client.util.toProperCase(category);
      if (displayedCategory === 'Nsfw') displayedCategory = 'NSFW';

      const pageFooter = totalPages === 1 ? '' : `Page ${pageNumber}/${totalPages}`;
      em.setTitle(`${displayedCategory} Commands`);

      if (pageFooter) {
        em.setFooter({
          text: pageFooter,
        });
      }

      const message = await msg.channel.send({ embeds: [em], components: [rowWithButtons] });

      const buttonCollector = message.createMessageComponentCollector({
        filter: (btnInteraction) => btnInteraction.user.id === msg.author.id,
        time: 60000,
      });

      buttonCollector.on('collect', async (btnInteraction) => {
        if (btnInteraction.customId === 'prev_page') {
          pageNumber--;
        } else if (btnInteraction.customId === 'next_page') {
          pageNumber++;
        }

        const startIndex = (pageNumber - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const commandsToDisplay = commandsArray.slice(startIndex, endIndex);

        em.setFields([]);
        commandsToDisplay.forEach((c) => {
          em.addFields([
            {
              name: `**${msg.settings.prefix}${this.client.util.toProperCase(c.help.name)}**`,
              value: `${c.help.description}`,
              inline: true,
            },
          ]);
        });

        let displayedCategory = this.client.util.toProperCase(category);
        if (displayedCategory === 'Nsfw') displayedCategory = 'NSFW';

        const pageFooter = totalPages === 1 ? '' : `Page ${pageNumber}/${totalPages}`;
        em.setTitle(`${displayedCategory} Commands`);

        if (pageFooter) {
          em.setFooter({
            text: pageFooter,
          });
        }

        const prevButton = new ButtonBuilder()
          .setCustomId('prev_page')
          .setLabel('Previous')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(pageNumber === 1);
        const nextButton = new ButtonBuilder()
          .setCustomId('next_page')
          .setLabel('Next')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(pageNumber === totalPages);

        const rowWithButtons = new ActionRowBuilder().addComponents(prevButton, nextButton);

        await btnInteraction.update({ embeds: [em], components: [rowWithButtons] });
      });
    } else {
      return msg.channel.send({ embeds: [errorEmbed] });
    }
  }
}

module.exports = Help;
