const {
  EmbedBuilder,
  ChannelType,
  ButtonStyle,
  ButtonBuilder,
  ActionRowBuilder,
  ChannelSelectMenuBuilder,
  ComponentType,
} = require('discord.js');
const Command = require('../../base/Command.js');
const { stripIndents } = require('common-tags');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

class Setup extends Command {
  constructor(client) {
    super(client, {
      name: 'setup',
      description: 'Setup the different systems of the bot',
      usage: 'setup <logging | tickets | warns>',
      category: 'Administrator',
      permLevel: 'Administrator',
      aliases: ['setlogchannel', 'setupticket', 'logsetup', 'ticketsetup', 'setupwarns'],
      guildOnly: true,
    });
  }

  async run(msg, args) {
    const type = args[0]?.toLowerCase();
    const successColor = msg.settings.embedSuccessColor;

    if (['ticket', 'tix', 'tickets'].includes(type)) {
      const filter = (m) => m.author.id === msg.author.id;
      const filter2 = (m) => ['y', 'yes', 'n', 'no'].includes(m.content.toLowerCase()) && m.author.id === msg.author.id;

      if (!msg.guild.members.me.permissions.has('ManageChannels')) {
        return this.client.util.errorEmbed(msg, 'The bot is missing Manage Channels permission.');
      }
      if (!msg.guild.members.me.permissions.has('ManageRoles')) {
        return this.client.util.errorEmbed(msg, 'The bot is missing Manage Roles permission.');
      }
      if (!msg.guild.members.me.permissions.has('ManageMessages')) {
        return this.client.util.errorEmbed(msg, 'The bot is missing Manage Messages permission');
      }

      // Check if the system is setup already
      const connection = await this.client.db.getConnection();
      const [rows] = await connection.execute(`SELECT * FROM ticket_settings WHERE server_id = ?`, [msg.guild.id]);

      if (rows.length > 0) {
        const config = rows[0];
        console.log(config.ticket_limit, config.role_id, config.cat_id, config.log_id);
      }
      if (rows.length > 0) {
        const catID = rows[0].cat_id;
        const roleID = rows[0].role_id;

        if (catID) {
          await msg.channel.send(stripIndents`
            The ticket system is already set up in this server. Would you like to:
            1️⃣ Reuse existing ticket channels and just update the menu.
            2️⃣ Select new ticket creation and log channels.
            3️⃣ Disable and delete the tickets data.
            4️⃣ Update the max number of tickets a user can open.
            (Reply a number or cancel)
            `);

          const collected = await msg.channel.awaitMessages({ filter, max: 1, time: 60000, errors: ['time'] });
          if (!collected) return msg.channel.send('Setup cancelled due to no response.');

          const choice = collected.first().content.toLowerCase();
          if (choice === 'cancel') return msg.channel.send('Got it! Setup cancelled.');

          // Update the max number of tickets
          if (choice === '4') {
            // code goes here
            await msg.channel.send(
              'How many tickets should a user be able to open? Please respond in number form, the default is 3.',
            );

            const collectedMaxTicketsQuestion = await msg.channel.awaitMessages({
              filter2,
              max: 1,
              time: 60000,
              errors: ['time'],
            });
            if (!collectedMaxTicketsQuestion) {
              connection.release();
              return this.client.util.errorEmbed(msg, 'You did not reply in time, the command has been cancelled.');
            }
            let ticketLimit = parseInt(collectedMaxTicketsQuestion.first().content.toLowerCase());

            while (isNaN(ticketLimit)) {
              ticketLimit = await this.client.util.awaitReply(
                msg,
                'How many tickets should a user be able to open? Please respond in number form, the default is 3.',
              );
              if (!ticketLimit) {
                connection.release();
                return this.client.util.errorEmbed(msg, 'You did not reply in time, the command has been cancelled.');
              }
              ticketLimit = parseInt(ticketLimit);
            }
            await db.set(`servers.${msg.guild.id}.tickets.limit`, ticketLimit);
            return msg.channel.send(`The ticket limit has been updated to ${ticketLimit}.`);
          }
          // End of updating max number of tickets

          // Disable the ticket system
          if (choice === '3') {
            // Delete the database entry (Hopefully this works, copilot wrote it)
            await connection.execute(`DELETE FROM ticket_settings WHERE server_id = ?`, [msg.guild.id]);
            return msg.channel.send(
              'The ticket system has been removed from the bots memory, you will need to delete the channels manually.',
            );
          }

          // Select new ticket creation and log channels
          if (choice === '2') {
            async function getChannelSelectionMenu(msg, placeholder, content) {
              const menu = new ChannelSelectMenuBuilder()
                .setCustomId('channel_select')
                .setPlaceholder(placeholder)
                .setMinValues(1)
                .setMaxValues(1)
                .addChannelTypes(ChannelType.GuildText);

              const row = new ActionRowBuilder().addComponents(menu);
              const menuMessage = await msg.channel.send({ content, components: [row] });

              try {
                const collected = await menuMessage.awaitMessageComponent({
                  componentType: ComponentType.ChannelSelect,
                  filter: (interaction) => interaction.user.id === msg.author.id,
                  time: 60000,
                });

                await collected.deferUpdate();
                await menuMessage.delete();
                return collected.channels.first(); // Return the selected channel
              } catch (err) {
                await menuMessage.delete();
                return msg.channel.send('Channel selection timed out.');
              }
            }

            const newLoggingChannel = await getChannelSelectionMenu(
              msg,
              'Select the ticket creation channel',
              'What channel do you want to use for logging?',
            );

            await db.set(`servers.${msg.guild.id}.tickets.logID`, newLoggingChannel.id);

            await msg.channel.send(stripIndents`Do you want to create a ticket creation menu? (yes/no)
              You have 60 seconds.
      
              Type \`cancel\` to exit.`);

            const collectedCreationQuestion = await msg.channel.awaitMessages({
              filter2,
              max: 1,
              time: 60000,
              errors: ['time'],
            });
            if (!collectedCreationQuestion) {
              return this.client.util.errorEmbed(msg, 'You did not reply in time, the command has been cancelled.');
            }
            const response1 = collectedCreationQuestion.first().content.toLowerCase();

            if (response1 === 'cancel') {
              return collectedCreationQuestion.first().reply('Got it! The command has been cancelled.');
            }
            const ticketCreationMenu = ['yes', 'y'].includes(response1) ? 'yes' : 'no';

            const catPerms = [
              {
                id: msg.guild.id,
                deny: ['ViewChannel'],
              },
              {
                id: msg.guild.members.me.id,
                allow: ['ViewChannel'],
              },
              {
                id: roleID,
                allow: ['ViewChannel'],
              },
            ];

            const logPerms = [
              {
                id: msg.guild.id,
                deny: ['ViewChannel'],
              },
              {
                id: msg.guild.members.me.id,
                allow: ['ViewChannel'],
              },
              {
                id: roleID,
                allow: ['ViewChannel'],
              },
            ];

            const category = newLoggingChannel.parent;
            category.permissionOverwrites.set(catPerms);
            newLoggingChannel.permissionOverwrites.set(logPerms);
            await db.set(`servers.${msg.guild.id}.tickets.catID`, category.id);
            await msg.channel.send(
              'I have set the ticket channels category to the new logging channels category and updated the category and logging channel permissions.',
            );

            let newMenuChannel;
            let oldChannelName;

            // Create the ticket creation message & button
            let renamed = false;
            if (ticketCreationMenu === 'yes') {
              newMenuChannel = await getChannelSelectionMenu(
                msg,
                'Select the ticket creation channel',
                'What channel do you want to use for the button menu?',
              );

              const embed = new EmbedBuilder().setTitle('New Ticket').setColor(successColor);

              const reactPerms = [
                {
                  id: msg.guild.id,
                  allow: ['ViewChannel'],
                  deny: ['AddReactions', 'SendMessages'],
                },
                {
                  id: msg.guild.members.me.id,
                  allow: ['AddReactions', 'SendMessages'],
                },
              ];

              await msg.channel.send(
                stripIndents`What do you want the ticket creation message to say?
                The color for the menu will be the bots embed success color.
                Users will have to click a button to open a new ticket.
                You have 120 seconds.`,
              );

              // This is to ask what to put inside the embed description for ticket creation message
              const collectedCreationMessage = await msg.channel.awaitMessages({
                filter,
                max: 1,
                time: 120000,
                errors: ['time'],
              });
              if (!collectedCreationMessage) {
                return this.client.util.errorEmbed(msg, 'You did not reply in time, the command has been cancelled.');
              }

              // Set the ticket creation menu message
              embed.setDescription(collectedCreationMessage.first().content);

              // Create the persistent button
              const button = new ButtonBuilder()
                .setCustomId('create_ticket')
                .setLabel('Open a Ticket')
                .setStyle(ButtonStyle.Primary);
              const row = new ActionRowBuilder().addComponents(button);

              newMenuChannel.permissionOverwrites.set(reactPerms);
              if (newMenuChannel.name.toLowerCase() !== 'new-ticket') {
                renamed = true;
                oldChannelName = newMenuChannel.name;
                await newMenuChannel.setName('new-ticket');
              }
              await newMenuChannel.send({ embeds: [embed], components: [row] });
            }

            return msg.channel.send(stripIndents`The ticket system is now fully re-functional.

              New Log Channel: ${newLoggingChannel}
              New Ticket Creation Channel: ${ticketCreationMenu === 'yes' ? newMenuChannel : 'Skipped'} ${
                renamed === true ? `Renamed from \`${oldChannelName}\`` : ''
              }
              `);
          }
          // End of select new ticket creation and log channels

          // Create new ticket menu in existing channel
          if (choice === '1') {
            let ticketMenuChannel = msg.guild.channels.cache.find(
              (channel) => channel.name === 'new-ticket' && channel.parentId === catID,
            );

            if (!ticketMenuChannel) {
              return msg.channel.send(
                'I was unable to find a channel called `new-ticket` under the saved category ID. Please re-run setup and choose option 2.',
              );
            }

            await msg.channel.send(
              `I found the following channel, is this correct? (yes/no): ${ticketMenuChannel} \n\nType \`cancel\` to exit.`,
            );

            const collectedChannelQuestion = await msg.channel.awaitMessages({
              filter2,
              max: 1,
              time: 60000,
              errors: ['time'],
            });
            if (!collectedChannelQuestion) {
              return this.client.util.errorEmbed(msg, 'You did not reply in time, the command has been cancelled.');
            }
            const response1 = collectedChannelQuestion.first().content.toLowerCase();

            if (response1 === 'cancel') {
              return collectedChannelQuestion.first().reply('Got it! The command has been cancelled.');
            }
            const isCorrectChannel = ['yes', 'y'].includes(response1) ? 'yes' : 'no';

            let renamed = false;
            let oldChannelName;

            if (isCorrectChannel === 'no') {
              async function getChannelSelectionMenu(msg, placeholder, content) {
                const menu = new ChannelSelectMenuBuilder()
                  .setCustomId('channel_select')
                  .setPlaceholder(placeholder)
                  .setMinValues(1)
                  .setMaxValues(1)
                  .addChannelTypes(ChannelType.GuildText);

                const row = new ActionRowBuilder().addComponents(menu);
                const menuMessage = await msg.channel.send({ content, components: [row] });

                try {
                  const collected = await menuMessage.awaitMessageComponent({
                    componentType: ComponentType.ChannelSelect,
                    filter: (interaction) => interaction.user.id === msg.author.id,
                    time: 60000,
                  });

                  await collected.deferUpdate();
                  await menuMessage.delete();
                  return collected.channels.first(); // Return the selected channel
                } catch (err) {
                  await menuMessage.delete();
                  return msg.channel.send('Channel selection timed out.');
                }
              }

              ticketMenuChannel = await getChannelSelectionMenu(
                msg,
                'Select the ticket creation channel',
                'What channel do you want to use for ticket menu?',
              );

              if (ticketMenuChannel.name.toLowerCase() !== 'new-ticket') {
                renamed = true;
                oldChannelName = ticketMenuChannel.name;
                await ticketMenuChannel.setName('new-ticket');
              }
            }

            // collect the embed message and send the embed/button
            const reactPerms = [
              {
                id: msg.guild.id,
                allow: ['ViewChannel'],
                deny: ['AddReactions', 'SendMessages'],
              },
              {
                id: msg.guild.members.me.id,
                allow: ['AddReactions', 'SendMessages'],
              },
            ];

            await msg.channel.send(
              stripIndents`What do you want the ticket creation message to say?
              The color for the menu will be the bots embed success color.
              Users will have to click a button to open a new ticket.
              You have 120 seconds.`,
            );

            // This is to ask what to put inside the embed description for ticket creation message
            const collectedCreationMessage = await msg.channel.awaitMessages({
              filter,
              max: 1,
              time: 120000,
              errors: ['time'],
            });
            if (!collectedCreationMessage) {
              return this.client.util.errorEmbed(msg, 'You did not reply in time, the command has been cancelled.');
            }

            // Set the ticket creation menu message
            const embed = new EmbedBuilder()
              .setTitle('New Ticket')
              .setColor(successColor)
              .setDescription(collectedCreationMessage.first().content);

            // Create the persistent button
            const button = new ButtonBuilder()
              .setCustomId('create_ticket')
              .setLabel('Open a Ticket')
              .setStyle(ButtonStyle.Primary);
            const row = new ActionRowBuilder().addComponents(button);

            ticketMenuChannel.permissionOverwrites.set(reactPerms);
            await ticketMenuChannel.send({ embeds: [embed], components: [row] });

            return msg.channel.send(stripIndents`The new ticket menu has been sent to ${ticketMenuChannel}.
              ${renamed === true ? `Renamed channel from ${oldChannelName}` : ''}
              Please delete the old ticket menu manually.
              `);
          }
          // End of creating new ticket menu in existing channel

          return msg.channel.send('You selected an invalid response, please re-run the setup command.');
        }
      }
      // End of checking if the system is setup already

      // Start of ticket setup
      await msg.channel.send(stripIndents`What is the name of the role you want to use for support team?
      You have 60 seconds.

      Type \`cancel\` to exit.`);

      const collected = await msg.channel.awaitMessages({
        filter,
        max: 1,
        time: 60000,
        errors: ['time'],
      });

      if (!collected) {
        return this.client.util.errorEmbed(msg, 'You did not reply in time, the command has been cancelled.');
      }
      const response = collected.first().content;
      let role = this.client.util.getRole(msg, response);

      if (response.toLowerCase() === 'cancel')
        return collected.first().reply('Got it! The command has been cancelled.');

      if (role) {
        collected.first().reply(`I found the following role to use: ${role.name} (${role.id})`);
      } else {
        collected.first().reply(`I will create a role named ${response}`);
        role = await msg.guild.roles.create({ name: response, color: 'Blue', reason: 'Ticket System' });
      }
      await db.set(`servers.${msg.guild.id}.tickets.roleID`, role.id);

      await msg.channel.send(stripIndents`Do you want to create a ticket creation menu? (yes/no)
        You have 60 seconds.

        Type \`cancel\` to exit.`);

      const collectedCreationQuestion = await msg.channel.awaitMessages({
        filter2,
        max: 1,
        time: 60000,
        errors: ['time'],
      });
      if (!collectedCreationQuestion) {
        return this.client.util.errorEmbed(msg, 'You did not reply in time, the command has been cancelled.');
      }
      const response1 = collectedCreationQuestion.first().content.toLowerCase();

      if (response1 === 'cancel') {
        return collectedCreationQuestion.first().reply('Got it! The command has been cancelled.');
      }
      const ticketCreationMenu = ['yes', 'y'].includes(response1) ? 'yes' : 'no';

      const catPerms = [
        {
          id: msg.guild.id,
          deny: ['ViewChannel'],
        },
        {
          id: msg.guild.members.me.id,
          allow: ['ViewChannel'],
        },
        {
          id: role.id,
          allow: ['ViewChannel'],
        },
      ];

      const logPerms = [
        {
          id: msg.guild.id,
          deny: ['ViewChannel'],
        },
        {
          id: msg.guild.members.me.id,
          allow: ['ViewChannel'],
        },
        {
          id: role.id,
          allow: ['ViewChannel'],
        },
      ];

      const category = await msg.guild.channels.create({
        name: 'Tickets',
        type: ChannelType.GuildCategory,
        reason: 'Setting up tickets system',
        permissionOverwrites: catPerms,
      });
      await db.set(`servers.${msg.guild.id}.tickets.catID`, category.id);

      let ticketCreationChannel;

      // Create the ticket creation message & button
      if (ticketCreationMenu === 'yes') {
        const reactPerms = [
          {
            id: msg.guild.id,
            allow: ['ViewChannel'],
            deny: ['AddReactions', 'SendMessages'],
          },
          {
            id: msg.guild.members.me.id,
            allow: ['AddReactions', 'SendMessages'],
          },
        ];

        await msg.channel.send(
          stripIndents`What do you want the ticket creation message to say?
          The color for the menu will be the bots embed success color.
          Users will have to click a button to open a new ticket.
          You have 120 seconds.`,
        );

        // This is to ask what to put inside the embed description for ticket creation message
        const collectedCreationMessage = await msg.channel.awaitMessages({
          filter,
          max: 1,
          time: 120000,
          errors: ['time'],
        });
        if (!collectedCreationMessage) {
          return this.client.util.errorEmbed(msg, 'You did not reply in time, the command has been cancelled.');
        }

        // Set the ticket creation menu message
        const embed = new EmbedBuilder()
          .setTitle('New Ticket')
          .setColor(successColor)
          .setDescription(collectedCreationMessage.first().content);

        // Create the persistent button
        const button = new ButtonBuilder()
          .setCustomId('create_ticket')
          .setLabel('Open a Ticket')
          .setStyle(ButtonStyle.Primary);
        const row = new ActionRowBuilder().addComponents(button);

        ticketCreationChannel = await msg.guild.channels.create({
          name: 'new-ticket',
          type: ChannelType.GuildText,
          parent: category.id,
          permissionOverwrites: reactPerms,
          reason: 'Setting up tickets system',
        });
        await ticketCreationChannel.send({ embeds: [embed], components: [row] });
      } else {
        await msg.channel.send('To add a ticket menu later re-run setup and choose option 1.');
      }

      // Do the rest of the stuff here after creating embed
      const tixLog = await msg.guild.channels.create({
        name: 'ticket-logs',
        type: ChannelType.GuildText,
        parent: category.id,
        permissionOverwrites: logPerms,
        reason: 'Setting up tickets system',
      });

      await db.set(`servers.${msg.guild.id}.tickets.logID`, tixLog.id);

      return msg.channel.send(stripIndents`The ticket system is now fully functional.
        To change settings or disable the system re-run the setup.

        Log Channel: ${tixLog}
        Ticket Creation Channel: ${ticketCreationMenu === 'yes' ? ticketCreationChannel : 'Skipped'}`);
    }
    // End of ticket setup.

    // Random spaces to I know where to stop for mysql conversion
    //
    //
    //
    //
    //
    //
    //
    // Start of logging setup
    if (['logging', 'log', 'logs'].includes(type)) {
      const embed = new EmbedBuilder();

      const logSystem = {
        'channel-created': 'enabled',
        'channel-deleted': 'enabled',
        'channel-updated': 'enabled',
        'thread-created': 'enabled',
        'thread-deleted': 'enabled',
        'member-join': 'enabled',
        'member-leave': 'enabled',
        'member-timeout': 'enabled',
        'message-deleted': 'enabled',
        'message-edited': 'enabled',
        'role-created': 'enabled',
        'role-deleted': 'enabled',
        'role-updated': 'enabled',
        'v-channel-created': 'enabled',
        'v-channel-deleted': 'enabled',
        emoji: 'enabled',
        sticker: 'enabled',
        'bulk-messages-deleted': 'enabled',
        all: 'enabled',
      };

      args.shift();
      let text = args.join('');
      let chan = this.client.util.getChannel(msg, text);

      if (!args || args.length < 1) {
        text = await this.client.util.awaitReply(msg, 'What channel do you want to setup logging in?');
        if (!text) {
          return this.client.util.errorEmbed(msg, 'You did not reply in time, the command has been cancelled.');
        }
        chan = this.client.util.getChannel(msg, text);
      }

      let i = 2;
      while (!chan) {
        text = await this.client.util.awaitReply(
          msg,
          `That channel was not found, please try again with a valid server channel. Try #${i}`,
        );
        if (!text) {
          return this.client.util.errorEmbed(msg, 'You did not reply in time, the command has been cancelled.');
        }
        chan = this.client.util.getChannel(msg, text);

        i++;
      }

      const currentChan = await db.get(`servers.${msg.guild.id}.logs.channel`);

      if (currentChan) {
        await db.set(`servers.${msg.guild.id}.logs.logSystem`, logSystem);
        embed
          .setTitle('Successfully Changed')
          .setColor(successColor)
          .setThumbnail('https://i.cisn.xyz/piqe4/MovoNohA60/raw.png')
          .setDescription(
            `Everything related to logs will be posted in ${chan} from now on. \n\nUse ${msg.settings.prefix}help logging to see how to fine-tune the logging.`,
          )
          .setTimestamp();
        await msg.channel.send({ embeds: [embed] });
      } else {
        await db.set(`servers.${msg.guild.id}.logs.logSystem`, logSystem);
        embed
          .setTitle('Successfully Set')
          .setColor(successColor)
          .setThumbnail('https://i.cisn.xyz/piqe4/MovoNohA60/raw.png')
          .setDescription(
            `Everything related to logs will be posted in ${chan}. \n\nUse ${msg.settings.prefix}help logging to see how to fine-tune the logging.`,
          )
          .setTimestamp();
        await msg.channel.send({ embeds: [embed] });
      }
      await db.set(`servers.${msg.guild.id}.logs.channel`, chan.id);
      return;
    }
    // End of logging setup

    // Start of warns setup
    if (['warns', 'warn', 'warnings'].includes(type)) {
      if (!args || args.length < 3) {
        return this.client.util.errorEmbed(
          msg,
          msg.settings.prefix + 'setup Warns <channel-name> <Points for kick> <Points for ban>',
          'Command Usage',
        );
      }

      args.shift();
      let channelArg = args[0];
      let kickAmount = parseInt(args[1]);
      let banAmount = parseInt(args[2]);

      let logChannel = await this.client.util.getChannel(msg, channelArg);

      while (!logChannel) {
        channelArg = await this.client.util.awaitReply(
          msg,
          'That was an invalid channel. What channel do you want to setup logging in?',
        );
        logChannel = await this.client.util.getChannel(msg, channelArg);
      }

      while (isNaN(kickAmount)) {
        kickAmount = await this.client.util.awaitReply(
          msg,
          'How many points should be required to kick the member? Please respond with a number.',
        );
        if (!kickAmount) {
          return this.client.util.errorEmbed(msg, 'You did not reply in time, the command has been cancelled.');
        }
        kickAmount = parseInt(kickAmount);
      }

      while (isNaN(banAmount)) {
        banAmount = await this.client.util.awaitReply(
          msg,
          'How many points should be required to ban the member? Please respond with a number.',
        );
        if (!banAmount) {
          return this.client.util.errorEmbed(msg, 'You did not reply in time, the command has been cancelled.');
        }
        banAmount = parseInt(banAmount);
      }

      await db.set(`servers.${msg.guild.id}.warns.kick`, kickAmount);
      await db.set(`servers.${msg.guild.id}.warns.ban`, banAmount);
      await db.set(`servers.${msg.guild.id}.warns.channel`, logChannel.id);

      const em = new EmbedBuilder()
        .setTitle('Warns System Setup')
        .setColor(successColor)
        .setDescription(
          stripIndents`
        Warn information will now be sent to the log channel.
        
        **Kick Amount:** ${kickAmount}
        **Ban Amount:** ${banAmount}
        
        To change the amount of warns needed to kick or ban a user just re-run the command with the new amount.`,
        )
        .setTimestamp();

      await msg.channel.send({ embeds: [em] });
      return msg.guild.channels.cache.get(logChannel.id).send({ embeds: [em] });
    }
    // End of the warns setup

    // Base command if there are not any args
    const embed = new EmbedBuilder()
      .setTitle('Systems Setup')
      .setColor('#0000FF')
      .addFields([
        {
          name: 'Tickets',
          value: stripIndents`
          To setup the ticket system please use:
          \`${msg.settings.prefix}Setup Tickets\``,
        },
        {
          name: 'Logging',
          value: stripIndents`
          To setup the logging system please use:
          \`${msg.settings.prefix}Setup Logging <channel-name>\``,
        },
        {
          name: 'Warns',
          value: stripIndents`
          To setup the warnings system please use:
          \`${msg.settings.prefix}Setup Warnings <channel-name> <Points for kick> <Points for ban>\``,
        },
      ])
      .setAuthor({ name: msg.member.displayName, iconURL: msg.member.displayAvatarURL() });
    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = Setup;
