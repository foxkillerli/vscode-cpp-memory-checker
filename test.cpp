#include <iostream>

void memoryLeak() {
    int* ptr = new int(5);
    // Forgot to delete ptr, causing a memory leak.
}

class MyClass {
public:
    MyClass() {
        data = new char[100];
    }
    // Missing a destructor to delete[] data, causing a leak.
private:
    char* data;
};

int main() {
    memoryLeak();
    MyClass* obj = new MyClass();
    // Forgot to delete obj.
    std::cout << "Program finished." << std::endl;
    return 0;
}
