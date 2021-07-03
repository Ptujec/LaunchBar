// Remove Duplicate Email Addresses
// https://www.codegrepper.com/code-examples/javascript/set+to+remove+duplicates+in+javascript

function run(argument) {
    argument = argument.toLowerCase()

    m = argument // match
        .match(/\S+@\S+\.[a-z]+/g)

    u = [...new Set(m)] // unique 
        .sort()
        .toString()
        .replace(/,/g, '\n')
        .replace(/"|>|</g, '')

    LaunchBar.paste(u)
}