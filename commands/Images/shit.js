const Command = require('../../base/Command.js');
const { createCanvas, loadImage } = require('canvas');
const path = require('path');

class Shit extends Command {
  constructor(client) {
    super(client, {
      name: 'shit',
      description: "Displays you or the mentioned user's avatar as stepped in shit",
      category: 'Images',
      usage: 'shit [user]',
    });
  }

  async run(msg, args) {
    let infoMem; // Will store the GuildMember or User object
    let fetchedUser; // Will store the User object

    // If text is provided, try to get the member from the guild
    if (args?.length > 0) {
      infoMem = await this.client.util.getMember(msg, args.join(' ').toLowerCase());
    } else {
      infoMem = msg.member;
    }

    if (!infoMem) {
      // If no member is found, try to fetch the user by ID
      const findId = args.join(' ').toLowerCase().replace(/<@|>/g, '');

      try {
        // Fetch the user object using the ID
        fetchedUser = await this.client.users.fetch(findId, { force: true });
      } catch (err) {
        // If the user cannot be fetched, default to the message author
        infoMem = msg.member; // Use the message author's member object
        fetchedUser = infoMem.user; // Get the User object from the member
      }
    } else {
      // If a member is found in the guild, fetch their user object
      fetchedUser = infoMem.user;
    }

    // Fetch the user's avatar as a PNG
    const avatarURL = fetchedUser.displayAvatarURL({ extension: 'png', size: 512, dynamic: false });

    // Generate the image
    try {
      const avatar = await loadImage(avatarURL);
      const canvas = createCanvas(600, 835);
      const ctx = canvas.getContext('2d');

      // Load and draw the shit image
      const shitPath = path.resolve(__dirname, '../../resources/images/plate_shit.png');
      const shit = await loadImage(shitPath);
      ctx.drawImage(shit, 0, 0, 600, 835);

      // Draw the avatar with rotation
      const avatarX = 220 + 75 / 2; // X-coordinate of the avatar's center
      const avatarY = 600 + 75 / 2; // Y-coordinate of the avatar's center
      const rotationAngle = (-40 * Math.PI) / 180; // Convert -30 degrees to radians (negative for counterclockwise)

      ctx.save(); // Save the current canvas state
      ctx.translate(avatarX, avatarY); // Move the canvas origin to the avatar's center
      ctx.rotate(rotationAngle); // Rotate the canvas counterclockwise
      ctx.drawImage(avatar, -75 / 2, -75 / 2, 75, 75); // Draw the avatar, offset by half its size
      ctx.restore(); // Restore the canvas state

      // Send the result
      const attachment = canvas.toBuffer();
      await msg.channel.send({
        files: [{ attachment, name: 'lgbt.png' }],
      });
    } catch (error) {
      this.client.logger.error(error.stack);
      msg.reply('There was an error processing the image.');
    }
  }
}

module.exports = Shit;
