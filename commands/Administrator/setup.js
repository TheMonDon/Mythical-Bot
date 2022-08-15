const Command = require('../../base/Command.js');
const { getChannel, getRole, verify, awaitReply } = require('../../util/Util.js');
const { EmbedBuilder, ChannelType } = require('discord.js');
const db = require('quick.db');
const { stripIndents } = require('common-tags');

class Setup extends Command {
  constructor (client) {
    super(client, {
      name: 'setup',
      description: 'Setup the different systems of the bot.',
      usage: 'setup <system>',
      category: 'Administrator',
      permLevel: 'Administrator',
      aliases: ['setlogchannel', 'setupticket', 'logsetup', 'ticketsetup'],
      guildOnly: true
    });
  }

  async run (msg, args) {
    const type = args[0]?.toLowerCase();

    if (['ticket', 'tix', 'tickets'].includes(type)) {
      const filter = m => m.author.id === msg.author.id;
      const filter2 = m => ['y', 'yes', 'n', 'no'].includes(m.content.toLowerCase()) && m.author.id === msg.author.id;

      if (!msg.guild.members.me.permissions.has('ManageChannels')) return msg.reply('The bot is missing manage channels permission.');
      if (!msg.guild.members.me.permissions.has('ManageRoles')) return msg.reply('The bot is missing manage roles permission');
      if (!msg.guild.members.me.permissions.has('ManageMessages')) return msg.reply('The bot is missing manage messages permission');

      // Check if the system is setup already
      if (db.get(`servers.${msg.guild.id}.tickets`)) {
        const { catID } = db.get(`servers.${msg.guild.id}.tickets`);
        if (catID) {
          // Alert them of what happens
          await msg.channel.send(stripIndents`The ticket system has already been setup in this server. **Do you want to re-run the setup?**
          
          Please note, this will override the old channel categories and log channels, you will have to delete the old ones manually.
  
          Type \`cancel\` to exit.
          `);

          const collected = await verify(msg.channel, msg.author);
          if (!collected) return collected.first().reply('Got it! Nothing has been changed.');
          else db.delete(`servers.${msg.guild.id}.tickets`);
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
        errors: ['time']
      });

      if (!collected) return msg.reply('You did not reply in time, the command has been cancelled.');
      const response = collected.first().content.toLowerCase();
      let role = getRole(msg, response);

      if (response.toLowerCase() === 'cancel') return collected.first().reply('Got it! The command has been cancelled.');

      if (role) {
        collected.first().reply(`I found the following role to use: ${role.name} (${role.id})`);
      } else {
        collected.first().reply(`I will create a role named ${response}`);
        role = await msg.guild.roles.create({ name: response, color: 'BLUE', reason: 'Ticket System' });
      }
      db.set(`servers.${msg.guild.id}.tickets.roleID`, role.id);

      await msg.channel.send(stripIndents`Do you want to create a new ticket reaction menu? (yes/no)
        You have 60 seconds.

        Type \`cancel\` to exit.`);

      // This is for second question
      const collected2 = await msg.channel.awaitMessages({
        filter2,
        max: 1,
        time: 60000,
        errors: ['time']
      });
      if (!collected2) return msg.reply('You did not reply in time, the command has been cancelled.');
      const response1 = collected2.first().content.toLowerCase();

      if (response1 === 'cancel') return collected2.first().reply('Got it! The command has been cancelled.');
      ['yes', 'y'].includes(response1) ? reaction = 'yes' : reaction = 'no';

      const catPerms = [
        {
          id: msg.guild.id,
          deny: ['ViewChannel']
        },
        {
          id: msg.guild.members.me.id,
          allow: ['ViewChannel']
        },
        {
          id: role.id,
          allow: ['ViewChannel']
        }
      ];

      const logPerms = [
        {
          id: msg.guild.id,
          deny: ['ViewChannel']
        },
        {
          id: msg.guild.members.me.id,
          allow: ['ViewChannel']
        },
        {
          id: role.id,
          allow: ['ViewChannel']
        }
      ];

      const category = await msg.guild.channels.create({ name: 'Tickets', type: ChannelType.GuildCategory, reason: 'Setting up tickets system', permissionOverwrites: catPerms });
      db.set(`servers.${msg.guild.id}.tickets.catID`, category.id);

      const embed = new EmbedBuilder();
      // Create the reaction message stuff
      if (reaction === 'yes') {
        embed
          .setTitle('New Ticket')
          .setColor('#00FF00');

        const reactPerms = [
          {
            id: msg.guild.id,
            allow: ['ViewChannel'],
            deny: ['AddReactions', 'SendMessages']
          },
          {
            id: msg.guild.members.me.id,
            allow: ['AddReactions', 'SendMessages']
          }
        ];

        await msg.channel.send(stripIndents`What do you want the reaction message to say?
          Please note the reaction emoji is: 📰.
          You have 120 seconds.`);

        // This is to ask what to put inside the embed description for reaction message
        const collected3 = await msg.channel.awaitMessages({
          filter,
          max: 1,
          time: 120000,
          errors: ['time']
        });
        if (!collected3) return msg.reply('You did not reply in time, the command has been cancelled.');

        const response2 = collected3.first().content.toLowerCase();
        embed.setDescription(response2);
        const rchan = await msg.guild.channels.create({ name: 'new-ticket', type: ChannelType.GuildText, parent: category.id, permissionOverwrites: reactPerms });
        const embed1 = await rchan.send({ embeds: [embed] });
        await embed1.react('📰');

        db.set(`servers.${msg.guild.id}.tickets.reactionID`, embed1.id);
      }

      // Do the rest of the stuff here after creating embed
      const tixLog = await msg.guild.channels.create({ name: 'ticket-logs', type: ChannelType.GuildText, parent: category.id, permissionOverwrites: logPerms });

      db.set(`servers.${msg.guild.id}.tickets.logID`, tixLog.id);

      return msg.reply('Awesome! Everything has been setup.');
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
        'message-deleted': 'enabled',
        'message-edited': 'enabled',
        'role-created': 'enabled',
        'role-deleted': 'enabled',
        'role-updated': 'enabled',
        'v-channel-created': 'enabled',
        'v-channel-deleted': 'enabled',
        'emoji-created': 'enabled',
        'emoji-deleted': 'enabled',
        'bulk-messages-deleted': 'enabled',
        all: 'enabled'
      };

      args.shift();
      let text = args.join(' ');
      if (!args || args.length < 1) {
        text = await awaitReply(msg, 'What channel do you want to setup logging in?');
        if (!text) return msg.reply('The command has been cancelled due to no reply.');
      }

      const chan = getChannel(msg, text);

      if (!chan) return msg.reply('Please provide a valid server channel.');
      const currentChan = db.get(`servers.${msg.guild.id}.logs.channel`);

      if (currentChan) {
        embed
          .setTitle('Successfully Changed')
          .setColor('#00FF00')
          .setThumbnail('https://cdn.discordapp.com/emojis/482184108555108358.png')
          .setDescription(`Everything related to logs will be posted in ${chan} from now on.`)
          .setTimestamp()
          .setFooter({ text: 'Logs System V3.2' });
        msg.channel.send({ embeds: [embed] });
      } else {
        db.set(`servers.${msg.guild.id}.logs.logSystem`, logSystem);
        embed
          .setTitle('Successfully Set')
          .setColor('#00FF00')
          .setThumbnail('https://cdn.discordapp.com/emojis/482184108555108358.png')
          .setDescription(`Everything related to logs will be posted in ${chan}.`)
          .setTimestamp()
          .setFooter({ text: 'Logs System V3.2' });
        msg.channel.send({ embeds: [embed] });
      }
      db.set(`servers.${msg.guild.id}.logs.channel`, chan.id);
      return;
    }
    // End of logging setup

    // Base command if there is not any args
    const embed = new EmbedBuilder()
      .setTitle('Systems Setup')
      .setColor('#0000FF')
      .addFields([
        {
          name: 'Tickets',
          value: stripIndents`
          To setup the ticket system please use:
          \`${msg.settings.prefix}Setup Ticket\`

          This system should be fully operational`
        },
        {
          name: 'Logging',
          value: stripIndents`
          To setup the logging system please use:
          \`${msg.settings.prefix}Setup Logging\`
  
          This system should be fully operational.`
        }
      ])
      .setDescription('These systems are not fully operational and may have bugs.')
      .setAuthor({ name: msg.member.displayName, iconURL: msg.author.displayAvatarURL() });
    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = Setup;
