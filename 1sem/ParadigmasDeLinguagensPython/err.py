from math import e


try:
    num=int(input("Enter a number: "))
    print(num)
except ValueError:
    print("Invalid input")
except ZeroDivisionError:
    print("Can't divide by zero")
except IndexError:
    print("Index out of range")
except:
    print("Something went wrong")