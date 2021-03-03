const Command = require('../../base/Command.js');
const DiscordJS = require('discord.js');
const db = require('quick.db');
const { stripIndents } = require('common-tags');

class setup extends Command {
  constructor (client) {
    super(client, {
      name: 'setup',
      description: 'Setup the different systems of the bot.',
      usage: 'setup <system>',
      category: 'Administator',
      guildOnly: true,
      permLevel: 'Administator',
      aliases: ['setlogchannel', 'setupticket', 'logsetup', 'ticketsetup']
    });
  }

  async run (msg, args) {
    const type = args[0];
    const server = msg.guild;

    if (['ticket', 'tix', 'tickets'].includes(type)) {
      const filter = m => m.author.id === msg.author.id;
      const filter2 = m => ['y', 'yes', 'n', 'no'].includes(m.content.toLowerCase()) && m.author.id === msg.author.id;

      if (!msg.guild.me.permissions.has('MANAGE_CHANNELS')) return msg.channel.send('The bot is missing manage channels perm.');
      if (!msg.guild.me.permissions.has('MANAGE_ROLES')) return msg.channel.send('The bot is missing manage roles perm');
      if (!msg.guild.me.permissions.has('MANAGE_MESSAGES')) return msg.channel.send('The bot is missing manage messages perm');

      // Check if the system is setup already
      if (db.get(`servers.${msg.guild.id}.tickets`)) {
        const { catID } = db.get(`servers.${msg.guild.id}.tickets`);
        if (catID) {
          // Alert them of what happens
          msg.channel.send(stripIndents`The ticket system has already been setup in this server, do you want to re-run the setup?
          
          Please note, this will override the old channel categories and log channels, you will have to delete the old ones manually.
  
          Type \`cancel\` to exit.
          `);

          // This is for the first question
          return msg.channel.awaitMessages(filter2, {
            max: 1,
            time: 60000,
            errors: ['time']
          })
            .then(async (collected) => {
              const response = collected.first().content;

              if (response.toLowerCase().includes('n', 'no')) return msg.channel.send('Got it! Nothing has been changed.');

              if (response.toLowerCase() === 'cancel') return msg.channel.send('Got it! The command has been cancelled.');

              if (response.toLowerCase().includes('y', 'yes')) {
                db.delete(`servers.${msg.guild.id}.tickets.catID`);
                return msg.channel.send('Alright I deleted the database for tickets, please re-run the setup command.');
              }
            });
        }
      }

      msg.channel.send(stripIndents`What is the name of the role you want to use for support team?
      You have 60 seconds.

      Type \`cancel\` to exit.`);
      let reaction;

      // This is for the first question
      return msg.channel.awaitMessages(filter, {
        max: 1,
        time: 60000,
        errors: ['time']
      })
        .then(async (collected) => {
          const response = collected.first().content;
          let role = msg.guild.roles.cache.find(m => m.name.toLowerCase() === response.toLowerCase()) ||
            msg.guild.roles.cache.find(m => m.name === response) ||
            msg.guild.roles.cache.find(m => m.name.startsWith(response));

          if (response.toLowerCase() === 'cancel') return msg.channel.send('Got it! The command has been cancelled.');

          if (role) {
            msg.channel.send(`I found the following role: ${role.name}`);
          } else {
            msg.channel.send(`I will create a role named ${response}`);
            role = await msg.guild.roles.create({
              data: {
                name: response,
                color: 'BLUE'
              }
            });
          }
          db.set(`servers.${server.id}.tickets.roleID`, role.id);

          msg.channel.send(stripIndents`Do you want to create a new ticket reaction menu?
          You have 60 seconds.

          Type \`cancel\` to exit.`);

          // This is for second question
          return msg.channel.awaitMessages(filter2, {
            max: 1,
            time: 60000,
            errors: ['time']
          })
            .then(async (collected2) => {
              const response1 = collected2.first().content.toLowerCase();

              if (response1 === 'cancel') return msg.channel.send('Got it! The command has been cancelled.');
              ['yes', 'y'].includes(response1) ? reaction = 'yes' : reaction = 'no';

              const catPerms = [
                {
                  id: msg.guild.id,
                  deny: ['VIEW_CHANNEL']
                },
                {
                  id: msg.guild.me.id,
                  allow: ['VIEW_CHANNEL']
                },
                {
                  id: role.id,
                  allow: ['VIEW_CHANNEL']
                }
              ];

              const logPerms = [
                {
                  id: msg.guild.id,
                  deny: ['VIEW_CHANNEL']
                },
                {
                  id: msg.guild.me.id,
                  allow: ['VIEW_CHANNEL']
                },
                {
                  id: role.id,
                  allow: ['VIEW_CHANNEL']
                }
              ];

              const category = await msg.guild.channels.create('Tickets', { type: 'category', reason: 'Setting up tickets system', permissionOverwrites: catPerms });
              db.set(`servers.${server.id}.tickets.catID`, category.id);

              const embed = new DiscordJS.MessageEmbed();
              // Create the reaction message stuff
              if (reaction === 'yes') {
                embed.setTitle('New Ticket');
                embed.setColor('GREEN');

                const reactPerms = [
                  {
                    id: msg.guild.id,
                    allow: ['VIEW_CHANNEL'],
                    deny: ['ADD_REACTIONS', 'SEND_MESSAGES']
                  },
                  {
                    id: msg.guild.me.id,
                    allow: ['ADD_REACTIONS', 'SEND_MESSAGES']
                  }
                ];

                await msg.channel.send(stripIndents`What do you want the reaction message to say?
                Plesse note the reaction emoji is: 📰.
                You have 120 seconds.`);

                // This is to ask what to put inside the embed description for reaction role
                await msg.channel.awaitMessages(filter, {
                  max: 1,
                  time: 120000,
                  errors: ['time']
                })
                  .then(async (collected3) => {
                    const response2 = collected3.first().content;
                    embed.setDescription(response2);
                    const rchan = await msg.guild.channels.create('new-ticket', { type: 'text', parent: category.id, permissionOverwrites: reactPerms });
                    const embed1 = await rchan.send(embed);
                    await embed1.react('📰');

                    db.set(`servers.${server.id}.tickets.reactionID`, embed1.id);
                  })
                  .catch(_err => {
                    return msg.channel.send('You did not reply in time.');
                  });
              }

              // Do the rest of the stuff here after creating embed
              const tixLog = await msg.guild.channels.create('ticket-logs', { type: 'text', parent: category.id, permissionOverwrites: logPerms });

              db.set(`servers.${server.id}.tickets.logID`, tixLog.id);

              return msg.channel.send('Awesome! Everything has been setup.');
            })
            .catch(_err => {
              return msg.channel.send('You did not reply in time.');
            });
        })
        .catch(_err => {
          return msg.channel.send('You did not reply in time.');
        });
    }
    // End of ticket setup...what else do i need to use this for anyways?

    if (['logging', 'log', 'logs'].includes(type)) {
      const embed = new DiscordJS.MessageEmbed();

      const logSystem = {
        'channel-created': 'enabled',
        'channel-deleted': 'enabled',
        'channel-updated': 'enabled',
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
      const text = args.join(' ');
      if (!args || args.length < 1) {
        return msg.channel.send(`Incorrect Usage: ${msg.settings.prefix}setup logging <channel>`);
      }
      const chan = msg.mentions.channels.first() || server.channels.cache.find(c => c.id === text) ||
        server.channels.cache.find(c => c.name.toLowerCase() === text.toLowerCase()) ||
        server.channels.cache.find(c => c.name.toLowerCase().includes(text.toLowerCase()));

      if (!chan) return msg.channel.send('Please provide a valid server channel.');
      const currentChan = db.get(`servers.${msg.guild.id}.logs.channel`);

      if (currentChan) {
        embed.setTitle('Sucessfully Changed');
        embed.setColor('GREEN');
        embed.setThumbnail('https://cdn.discordapp.com/emojis/482184108555108358.png');
        embed.setDescription(`Everything related to logs will be posted in ${chan} from now on.`);
        embed.setTimestamp();
        embed.setFooter('Logs System V3.0-BETA');
        msg.channel.send(embed);
      } else {
        db.set(`servers.${msg.guild.id}.logs.logSystem`, logSystem);
        embed.setTitle('Sucessfully Set');
        embed.setColor('GREEN');
        embed.setThumbnail('https://cdn.discordapp.com/emojis/482184108555108358.png');
        embed.setDescription(`Everything related to logs will be posted in ${chan}.`);
        embed.setTimestamp();
        embed.setFooter('Logs System V3.0-BETA');
        msg.channel.send(embed);
      }
      db.set(`servers.${msg.guild.id}.logs.channel`, chan.id);
      return;
    }
    // End of logging setup

    // Base command if there is not any args
    const embed = new DiscordJS.MessageEmbed()
      .setTitle('Systems Setup')
      .setColor('BLUE')
      .addField('Tickets', stripIndents`
    To setup the ticket system please use:
    \`${msg.settings.prefix}Setup Ticket\`

    This is not finished!
    `)
      .addField('Logging', stripIndents`
    To setup the logging system please use:
    \`${msg.settings.prefix}Setup Logging\`

    This system should be fully operational.
    `)
      .setDescription('These systems are not fully operational and may have bugs.')
      .setAuthor(msg.author.displayName, msg.author.displayAvatarURL());
    return msg.channel.send(embed);
  }
}

module.exports = setup;
