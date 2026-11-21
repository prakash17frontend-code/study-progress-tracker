
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from '../database/entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  // Get all users (used by the mentor dashboard)
  findAll() {
    return this.userRepository.find({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  // Find a user using email
  findByEmail(email: string) {
    return this.userRepository.findOne({
      where: { email },
    });
  }

  // Find a user using ID
  findById(id: string) {
    return this.userRepository.findOne({
      where: { id },
    });
  }

  // Create a new user
  create(data: Partial<User>) {
    const user = this.userRepository.create(data);
    return this.userRepository.save(user);
  }
}
