var i = 8;
var j = 6;

while(i < 6) {
	print(i);
	j *= i + 2;
	i++;
}

var num = ((6 * 7 - (9 + 2)) * 4 - 3) / 5;

// Comment Single

const some = Something.init();

if(some.exists) {
	some.load();
} else {
	some.create();
}

/*
	Comment Multi
*/

justCall(4);

var element = someArray[6];
some.prop = element.value;
some.prop.obj.func(6, true, "Example");