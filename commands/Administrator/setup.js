const { EmbedBuilder, ChannelType } = require('discord.js');
const Command = require('../../base/Command.js');
const { stripIndents } = require('common-tags');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

class Setup extends Command {
  constructor(client) {
    super(client, {
      name: 'setup',
      description: 'Setup the different systems of the bot',
      usage: 'setup <logs | tickets | warns>',
      category: 'Administrator',
      permLevel: 'Administrator',
      aliases: ['setlogchannel', 'setupticket', 'logsetup', 'ticketsetup', 'setupwarns'],
      guildOnly: true,
    });
  }

  async run(msg, args) {
    const type = args[0]?.toLowerCase();
    const successColor = msg.settings.embedSuccessColor;
    const errorEmbed = new EmbedBuilder()
      .setColor(msg.settings.embedErrorColor)
      .setAuthor({ name: msg.member.displayName, iconURL: msg.author.displayAvatarURL() });

    if (['ticket', 'tix', 'tickets'].includes(type)) {
      const filter = (m) => m.author.id === msg.author.id;
      const filter2 = (m) => ['y', 'yes', 'n', 'no'].includes(m.content.toLowerCase()) && m.author.id === msg.author.id;

      if (!msg.guild.members.me.permissions.has('ManageChannels')) {
        errorEmbed.setDescription('The bot is missing Manage Channels permission.');
        return msg.channel.send({ embeds: [errorEmbed] });
      }
      if (!msg.guild.members.me.permissions.has('ManageRoles')) {
        errorEmbed.setDescription('The bot is missing Manage Roles permission');
        return msg.channel.send({ embeds: [errorEmbed] });
      }
      if (!msg.guild.members.me.permissions.has('ManageMessages')) {
        errorEmbed.setDescription('The bot is missing Manage Messages permission');
        return msg.channel.send({ embeds: [errorEmbed] });
      }

      // Check if the system is setup already
      if (await db.get(`servers.${msg.guild.id}.tickets`)) {
        const { catID } = await db.get(`servers.${msg.guild.id}.tickets`);
        if (catID) {
          // Alert them of what happens
          await msg.channel
            .send(stripIndents`The ticket system has already been setup in this server. **Do you want to re-run the setup?**
          
          Please note, this will override the old channel categories and log channels, you will have to delete the old ones manually.
  
          Type \`cancel\` to exit.
          `);

          const collected = await this.client.util.verify(msg.channel, msg.author);
          if (!collected) {
            return collected.first().reply('Got it! Nothing has been changed.');
          } else {
            await db.delete(`servers.${msg.guild.id}.tickets`);
          }
        }
      }

      await msg.channel.send(stripIndents`What is the name of the role you want to use for support team?
      You have 60 seconds.

      Type \`cancel\` to exit.`);
      let reaction;

      const collected = await msg.channel.awaitMessages({
        filter,
        max: 1,
        time: 60000,
        errors: ['time'],
      });

      if (!collected) {
        errorEmbed.setDescription('You did not reply in time, the command has been cancelled.');
        return msg.channel.send({ embeds: [errorEmbed] });
      }
      const response = collected.first().content.toLowerCase();
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

      await msg.channel.send(stripIndents`Do you want to create a new ticket reaction menu? (yes/no)
        You have 60 seconds.

        Type \`cancel\` to exit.`);

      // This is for second question
      const collected2 = await msg.channel.awaitMessages({
        filter2,
        max: 1,
        time: 60000,
        errors: ['time'],
      });
      if (!collected2) {
        errorEmbed.setDescription('You did not reply in time, the command has been cancelled.');
        return msg.channel.send({ embeds: [errorEmbed] });
      }
      const response1 = collected2.first().content.toLowerCase();

      if (response1 === 'cancel') {
        return collected2.first().reply('Got it! The command has been cancelled.');
      }
      ['yes', 'y'].includes(response1) ? (reaction = 'yes') : (reaction = 'no');

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

      const embed = new EmbedBuilder();
      // Create the reaction message stuff
      if (reaction === 'yes') {
        embed.setTitle('New Ticket').setColor(successColor);

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

        await msg.channel.send(stripIndents`What do you want the reaction message to say?
          Please note the reaction emoji is: 📰.
          You have 120 seconds.`);

        // This is to ask what to put inside the embed description for reaction message
        const collected3 = await msg.channel.awaitMessages({
          filter,
          max: 1,
          time: 120000,
          errors: ['time'],
        });
        if (!collected3) {
          errorEmbed.setDescription('You did not reply in time, the command has been cancelled.');
          return msg.channel.send({ embeds: [errorEmbed] });
        }

        const response2 = collected3.first().content.toLowerCase();
        embed.setDescription(response2);
        const reactionChannel = await msg.guild.channels.create({
          name: 'new-ticket',
          type: ChannelType.GuildText,
          parent: category.id,
          permissionOverwrites: reactPerms,
        });
        const embed1 = await reactionChannel.send({ embeds: [embed] });
        await embed1.react('📰');

        await db.set(`servers.${msg.guild.id}.tickets.reactionID`, embed1.id);
      }

      // Do the rest of the stuff here after creating embed
      const tixLog = await msg.guild.channels.create({
        name: 'ticket-logs',
        type: ChannelType.GuildText,
        parent: category.id,
        permissionOverwrites: logPerms,
      });

      await db.set(`servers.${msg.guild.id}.tickets.logID`, tixLog.id);

      return msg.channel.send('Awesome! Everything has been setup.');
    }
    // End of ticket setup.

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
          errorEmbed.setDescription('You did not reply in time, the command has been cancelled.');
          return msg.channel.send({ embeds: [errorEmbed] });
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
          errorEmbed.setDescription('You did not reply in time, the command has been cancelled.');
          return msg.channel.send({ embeds: [errorEmbed] });
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
          .setThumbnail('https://cdn.discordapp.com/emojis/482184108555108358.png')
          .setDescription(`Everything related to logs will be posted in ${chan} from now on.`)
          .setTimestamp();
        msg.channel.send({ embeds: [embed] });
      } else {
        await db.set(`servers.${msg.guild.id}.logs.logSystem`, logSystem);
        embed
          .setTitle('Successfully Set')
          .setColor(successColor)
          .setThumbnail('https://cdn.discordapp.com/emojis/482184108555108358.png')
          .setDescription(`Everything related to logs will be posted in ${chan}.`)
          .setTimestamp();
        msg.channel.send({ embeds: [embed] });
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

      let channel;
      args.shift();
      let channelArg = args[0];
      let kickAmount = parseInt(args[1]);
      let banAmount = parseInt(args[2]);

      channel = await this.client.util.getChannel(msg, channelArg);

      while (!channel) {
        channelArg = await this.client.util.awaitReply(
          msg,
          'That was an invalid channel. What channel do you want to setup logging in?',
        );
        channel = await this.client.util.getChannel(msg, channelArg);
      }

      while (isNaN(kickAmount)) {
        kickAmount = await this.client.util.awaitReply(msg, 'How many points should be required to kick the member?');
        if (!kickAmount) {
          errorEmbed.setDescription('You did not reply in time, the command has been cancelled.');
          return msg.channel.send({ embeds: [errorEmbed] });
        }
        kickAmount = parseInt(kickAmount);
      }

      while (isNaN(banAmount)) {
        banAmount = await this.client.util.awaitReply(msg, 'How many points should be required to ban the member?');
        if (!banAmount) {
          errorEmbed.setDescription('You did not reply in time, the command has been cancelled.');
          return msg.channel.send({ embeds: [errorEmbed] });
        }
        banAmount = parseInt(banAmount);
      }

      await db.set(`servers.${msg.guild.id}.warns.kick`, kickAmount);
      await db.set(`servers.${msg.guild.id}.warns.ban`, banAmount);
      await db.set(`servers.${msg.guild.id}.warns.channel`, channel.id);

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
      return msg.guild.channels.cache.get(channel.id).send({ embeds: [em] });
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
          \`${msg.settings.prefix}Setup Ticket\``,
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
          To setup the warns system please use:
          \`${msg.settings.prefix}Setup Warns <channel-name> <Points for kick> <Points for ban>\``,
        },
      ])
      .setAuthor({ name: msg.member.displayName, iconURL: msg.author.displayAvatarURL() });
    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = Setup;
