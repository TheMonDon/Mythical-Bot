/* eslint-disable no-unused-vars */
const Command = require('../../base/Command.js');
const DiscordJS = require('discord.js');
const db = require('quick.db');

class setup extends Command {
  constructor (client) {
    super(client, {
      name: 'setup',
      description: 'Setup the different systems of the bot.',
      usage: 'setup <ticket>',
      category: 'General',
      guildOnly: true,
      permLevel: 'Administator'
    });
  }

  async run (msg, args) { // eslint-disable-line no-unused-vars
    const type = args[0];

    if (['ticket', 'tix', 'tickets'].includes(type)) {
      const filter = m => m.author.id === msg.author.id;
      const filter2 = m => ['y', 'yes', 'n', 'no'].includes(m.content.toLowerCase()) && m.author.id === msg.author.id;

      if (!msg.guild.me.permissions.has('MANAGE_CHANNELS')) return msg.channel.send('The bot is missing manage channels perm.');
      if (!msg.guild.me.permissions.has('MANAGE_ROLES')) return msg.channel.send('The bot is missing manage roles perm');
      if (!msg.guild.me.permissions.has('MANAGE_MESSAGES')) return msg.channel.send('The bot is missing manage messages perm');

      msg.channel.send('What is the name of the role you want to use for support team? \nYou have 60 seconds.');
      let reaction;

      // This is for the first question
      return msg.channel.awaitMessages(filter, {
        max: 1,
        time: 60000,
        errors: ['time']
      })
        .then(async (collected) => {
          const response = collected.first().content;
          const role = msg.guild.roles.cache.find(m => m.name.toLowerCase() === response.toLowerCase()) ||
          msg.guild.roles.cache.find(m => m.name === response) ||
          msg.guild.roles.cache.find(m => m.name.startsWith(response));

          if (response.toLowerCase() === 'cancel') return msg.channel.send('Got it! The command has been cancelled.');

          if (role) {
            msg.channel.send(`I found the following role: ${role.name}`);
          } else {
            msg.channel.send(`I will create a role named ${response}`);
            role.name = response;
          }

          msg.channel.send('Do you want to create a new ticket reaction menu?');

          // This is for second question
          return msg.channel.awaitMessages(filter2, {
            max: 1,
            time: 60000,
            errors: ['time']
          })
            .then(async (collected2) => {
              const response1 = collected2.first().content.toLowerCase();

              if (response1 === 'cancel') return msg.channel.send('Got it! The command has been cancelled.');

              if (['yes', 'y'].includes(response1)) {
                reaction = 'yes';
                msg.channel.send('I heard yes! I will get that ready.');
              } else {
                reaction = 'no';
                msg.channel.send('I heard no! We will skip that.');
              }


              const category = await msg.guild.channels.create('Tickets', { type: 'category', reason: 'Setting up tickets system'});
              
              const embed = new DiscordJS.MessageEmbed();
              // Create the reaction message stuff
              if (reaction === 'yes') {
                embed.setTitle('New Ticket');
                embed.setColor('GREEN');

                msg.channel.send('What do you want the reaction message to say? \nPlesse note the reaction emoji is :newspaper:');

                // This is to ask what to put inside the embed description for reaction role
                msg.channel.awaitMessages(filter, {
                  max: 1,
                  time: 120000,
                  errors: ['time']
                })
                  .then(async (collected3) => {
                    const response2 = collected3.first().content;
                    embed.setDescription(response2);
                  
                  })
                  .catch(_err => {
                    return msg.channel.send('You did not reply in time.');
                  });
              }
              
              // Do the rest of the stuff here after creating embed
              const tixLog = await msg.guild.channelsw.create('ticket-logs', { type: 'text', parent: category.id});
            })
            .catch(_err => {
              return msg.channel.send('You did not reply in time.');
            });
        })
        .catch(_err => {
          return msg.channel.send('You did not reply in time.');
        });
    }
    return msg.channel.send('This command is not setup yet..haha.');
  }
}

module.exports = setup;
